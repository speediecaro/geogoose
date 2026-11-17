$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$exporter = Join-Path $PSScriptRoot '..\tools\Export-QuebecMrc.ps1'
$output = Join-Path ([IO.Path]::GetTempPath()) ('geogoose-mrc-test-' + [guid]::NewGuid().ToString('N'))
$script:requests = New-Object 'Collections.Generic.List[object]'
$script:failure = ''

function Assert($Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}

function New-Address([string]$Id, [string]$Code, [int]$Number, [double]$Longitude, [string]$Quality, [long]$Modified) {
    [pscustomobject]@{ attributes = [pscustomobject]@{
        IDENTIFIANT_UNIQUE_ADRESSE = $Id; NUMERO_MUNICIPAL = $Number; NUMERO_MUNICIPAL_SUFFIXE = ''
        ODONYME_RECOMPOSE_LONG = 'rue Test'; CODE_MUNICIPALITE = $Code; NOM_MUNICIPALITE = 'Test'
        QUALITE_POSITIONNEMENT_GEOMETRIQUE = $Quality; DATE_MODIFICATION = $Modified
        DATE_DIFFUSION_VERSION = 1793491200000; LONGITUDE = $Longitude; LATITUDE = 47
    } }
}

$script:addressRecords = @(
    (New-Address ('0' * 32) '79050' 42 -75 'Building' 1704067200000),
    (New-Address ('1' * 32) '79050' 42 -75 'Uncertain' 1704153600000),
    (New-Address ('2' * 32) '79050' 44 -75.01 'Building' 1704067200000),
    (New-Address ('3' * 32) '79088' 10 -75.5 'Building' 1704067200000)
)

function Invoke-RestMethod([string]$Uri, [int]$TimeoutSec) {
    $script:requests.Add($Uri)
    if ($script:failure -eq 'arcgis') {
        return [pscustomobject]@{ error = [pscustomobject]@{ code = 400; message = 'Test exception' } }
    }
    $query = @{}
    foreach ($part in ([uri]$Uri).Query.TrimStart('?').Split('&')) {
        $pair = $part.Split('=', 2)
        $query[[uri]::UnescapeDataString($pair[0])] = [uri]::UnescapeDataString($pair[1])
    }
    if ($Uri -match '/SDA_WMS/MapServer/1/query') {
        return [pscustomobject]@{
            type = 'FeatureCollection'
            features = @([pscustomobject]@{
                type = 'Feature'
                properties = [pscustomobject]@{ MRS_CO_MRC = '79'; MRS_NM_MRC = 'Antoine-Labelle'; MRS_CO_VER = 'TEST' }
                geometry = [pscustomobject]@{
                    type = 'Polygon'
                    coordinates = @(
                        @(@(-76, 46), @(-74, 46), @(-74, 48), @(-76, 48), @(-76, 46)),
                        @(@(-75.9, 47.8), @(-75.8, 47.8), @(-75.8, 47.9), @(-75.9, 47.8))
                    )
                }
            })
        }
    }
    if ($Uri -match '/SDA_WMS/MapServer/2/query') {
        return [pscustomobject]@{ features = @(
            [pscustomobject]@{ attributes = [pscustomobject]@{ MUS_CO_GEO = '79050'; MUS_NM_MUN = 'Ascension' } },
            [pscustomobject]@{ attributes = [pscustomobject]@{ MUS_CO_GEO = '79088'; MUS_NM_MUN = 'Mont-Laurier' } },
            [pscustomobject]@{ attributes = [pscustomobject]@{ MUS_CO_GEO = '79902'; MUS_NM_MUN = 'Unpopulated TNO' } }
        ) }
    }
    if ($query.ContainsKey('returnCountOnly')) {
        $count = $script:addressRecords.Count
        if ($script:failure -eq 'count') { $count++ }
        return [pscustomobject]@{ count = $count }
    }
    Assert ($query.orderByFields -eq 'IDENTIFIANT_UNIQUE_ADRESSE') 'RQA requires its explicit persistent-ID sort.'
    Assert (-not $query.ContainsKey('resultOffset')) 'Unstable RQA offsets must not be used.'
    Assert ($query.where -match "CODE_MUNICIPALITE = '(\d+)'") 'Missing territory partition.'
    $code = $Matches[1]
    $records = @($script:addressRecords | Where-Object { $_.attributes.CODE_MUNICIPALITE -eq $code })
    if ($query.where -match "IDENTIFIANT_UNIQUE_ADRESSE LIKE '([0-9a-f]+)%'") {
        $prefix = $Matches[1]
        $records = @($records | Where-Object { $_.attributes.IDENTIFIANT_UNIQUE_ADRESSE.StartsWith($prefix) })
    }
    $limit = [int]$query.resultRecordCount
    return [pscustomobject]@{
        features = @($records | Select-Object -First $limit)
        exceededTransferLimit = ($records.Count -gt $limit)
    }
}

function Invoke-WebRequest([switch]$UseBasicParsing, [string]$Uri, [string]$Method,
    [string]$ContentType, [byte[]]$Body, [int]$TimeoutSec) {
    $xmlText = [Text.Encoding]::UTF8.GetString($Body)
    $script:requests.Add($xmlText)
    [xml]$xml = $xmlText
    Assert ($Method -eq 'Post') 'Exact boundary must be sent by POST.'
    Assert ($xmlText.Contains('<gml:interior>')) 'Boundary holes must be retained.'
    Assert ($xmlText.Contains('-76 46 ')) 'Longitude/latitude order changed.'
    Assert ($xmlText.Contains('urn:ogc:def:crs:OGC:1.3:CRS84')) 'Missing explicit CRS84.'
    Assert ($xmlText.Contains('<fes:Intersects>')) 'Building selection must use the exact boundary.'
    Assert ($xmlText.Contains('<fes:ValueReference>IDENTIFIANT</fes:ValueReference>')) 'Missing deterministic building sort.'
    if ($xml.DocumentElement.GetAttribute('resultType') -eq 'hits') {
        return [pscustomobject]@{ Content = '<FeatureCollection numberMatched="2" />' }
    }
    $offset = [int]$xml.DocumentElement.GetAttribute('startIndex')
    $id = $offset + 1
    if ($script:failure -eq 'building-order') { $id = 1 }
    $feature = [ordered]@{
        type = 'Feature'
        geometry = [ordered]@{
            type = 'MultiPolygon'
            coordinates = @(,(@(,(@(@(-75.001, 47), @(-75, 47), @(-75, 47.001), @(-75.001, 47))))))
        }
        properties = [ordered]@{
            IDENTIFIANT = $id; ID_BATIMENT = "test-$id"
            VERSION = 'TEST'; DATE_SOURCE = '2018-06-26'; NIVEAU_COMPLETUDE = 'NC-1'
        }
    }
    return [pscustomobject]@{ Content = (ConvertTo-Json -Depth 30 -Compress -InputObject @{
        type = 'FeatureCollection'; numberMatched = 2; numberReturned = 1; features = @($feature)
    }) }
}

try {
    . $exporter -OutputDirectory $output -PageSize 1
    $manifest = Get-Content -LiteralPath (Join-Path $output 'manifest.json') -Raw | ConvertFrom-Json
    $addresses = Get-Content -LiteralPath (Join-Path $output 'addresses.geojson') -Raw | ConvertFrom-Json
    Assert $manifest.complete 'Missing completion marker.'
    Assert ($manifest.addresses.sourceRecords -eq 4) 'Source records lost.'
    Assert ($manifest.addresses.points -eq 3) 'Incorrect unit grouping.'
    Assert ($manifest.addresses.territories.Count -eq 3) 'Empty TNO must remain in coverage inventory.'
    $house = @($addresses.features | Where-Object { $_.properties.number -eq '42' })
    Assert ($house.Count -eq 1) 'Duplicate unit labels.'
    Assert ($house[0].properties.quality -eq 'Building; Uncertain') 'Quality must not silently improve through grouping.'
    Assert ($house[0].properties.modified -eq '2024-01-02') 'Latest modification not retained.'
    Assert ($manifest.buildings.count -eq 2 -and $manifest.buildings.files.Count -eq 2) 'Incomplete WFS pagination.'
    foreach ($file in $manifest.files) {
        Assert ((Get-FileHash -LiteralPath (Join-Path $output $file.file)).Hash -eq $file.sha256) 'Checksum mismatch.'
    }
    $failureMessages = @{
        count = 'Address inventory changed or pagination was incomplete'
        'building-order' = 'Unstable or duplicate building pagination'
        arcgis = 'Test exception'
    }
    foreach ($failure in @('count', 'building-order', 'arcgis')) {
        $script:failure = $failure
        $failedOutput = $output + '-' + $failure
        $failed = $false
        try {
            . $exporter -OutputDirectory $failedOutput -PageSize 1
        } catch {
            Assert ($_.Exception.Message.Contains($failureMessages[$failure])) "Unexpected failure: $($_.Exception.Message)"
            $failed = $true
        }
        Assert $failed "Expected explicit failure: $failure"
        Assert (-not (Test-Path -LiteralPath (Join-Path $failedOutput 'manifest.json'))) 'Incomplete export marked complete.'
    }
    Write-Host 'PASS: full export, partitioning, empty territories, unit grouping, CRS/holes, WFS pagination, checksums and failure handling.'
} finally {
    foreach ($directory in @($output, ($output + '-count'), ($output + '-building-order'), ($output + '-arcgis'))) {
        if (Test-Path -LiteralPath $directory) { Remove-Item -LiteralPath $directory -Recurse -Force }
    }
}
