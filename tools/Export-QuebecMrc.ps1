[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory,
    [ValidatePattern('^\d{2,3}$')]
    [string]$MrcCode = '79',
    [ValidateRange(1, 2000)]
    [int]$PageSize = 2000
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$culture = [Globalization.CultureInfo]::InvariantCulture
$utf8 = New-Object Text.UTF8Encoding($false)
$rqa = 'https://servicescarto.mrnf.gouv.qc.ca/pes/rest/services/Territoire/RQA/MapServer/0/query'
$sda = 'https://servicescarto.mrnf.gouv.qc.ca/pes/rest/services/Territoire/SDA_WMS/MapServer'
$wfs = 'https://servicesvecto3.mern.gouv.qc.ca/geoserver/ReferentielBatiment_Pub/wfs'
$crs = 'urn:ogc:def:crs:OGC:1.3:CRS84'

function Get-Property($Object, [string]$Name) {
    $property = $Object.PSObject.Properties[$Name]
    if ($null -ne $property) { return $property.Value }
    return $null
}

function Invoke-ArcQuery([string]$Endpoint, [hashtable]$Parameters) {
    $query = foreach ($key in $Parameters.Keys) {
        [uri]::EscapeDataString($key) + '=' + [uri]::EscapeDataString([string]$Parameters[$key])
    }
    $result = Invoke-RestMethod -Uri ($Endpoint + '?' + ($query -join '&')) -TimeoutSec 120
    $errorData = Get-Property $result 'error'
    if ($null -ne $errorData) { throw ($Endpoint + ': ' + ($errorData | ConvertTo-Json -Depth 10 -Compress)) }
    return $result
}

function Write-Json([string]$Name, $Value) {
    $json = ConvertTo-Json -InputObject $Value -Depth 80 -Compress
    [IO.File]::WriteAllText((Join-Path $OutputDirectory $Name), $json, $utf8)
}

function Get-DateText($Milliseconds) {
    if ($null -eq $Milliseconds) { return $null }
    return [DateTimeOffset]::FromUnixTimeMilliseconds([long]$Milliseconds).UtcDateTime.ToString('yyyy-MM-dd')
}

function Assert-Position($Position) {
    if ($Position.Count -lt 2 -or $null -eq $Position[0] -or $null -eq $Position[1]) {
        throw 'Missing longitude/latitude.'
    }
    $x = [double]$Position[0]
    $y = [double]$Position[1]
    if ([double]::IsNaN($x) -or [double]::IsInfinity($x) -or
        [double]::IsNaN($y) -or [double]::IsInfinity($y) -or
        $x -lt -80 -or $x -gt -57 -or $y -lt 44 -or $y -gt 63) {
        throw "Unexpected Quebec longitude/latitude: $x, $y"
    }
}

function ConvertTo-GmlPolygon($Rings) {
    $builder = New-Object Text.StringBuilder
    [void]$builder.Append('<gml:Polygon srsName="' + $crs + '" srsDimension="2">')
    for ($i = 0; $i -lt $Rings.Count; $i++) {
        $tag = 'interior'
        if ($i -eq 0) { $tag = 'exterior' }
        [void]$builder.Append('<gml:' + $tag + '><gml:LinearRing><gml:posList>')
        foreach ($position in $Rings[$i]) {
            Assert-Position $position
            [void]$builder.Append(([double]$position[0]).ToString('R', $culture) + ' ' +
                ([double]$position[1]).ToString('R', $culture) + ' ')
        }
        [void]$builder.Append('</gml:posList></gml:LinearRing></gml:' + $tag + '>')
    }
    [void]$builder.Append('</gml:Polygon>')
    return $builder.ToString()
}

function Invoke-Buildings([string]$Geometry, [int]$Offset, [switch]$Hits) {
    $options = 'outputFormat="application/json" count="' + $PageSize + '" startIndex="' + $Offset + '"'
    if ($Hits) { $options = 'resultType="hits"' }
    $xml = '<wfs:GetFeature service="WFS" version="2.0.0" ' + $options +
        ' xmlns:wfs="http://www.opengis.net/wfs/2.0" xmlns:fes="http://www.opengis.net/fes/2.0"' +
        ' xmlns:gml="http://www.opengis.net/gml/3.2"' +
        ' xmlns:bat="https://servicesvecto3.mern.gouv.qc.ca/geoserver/ReferentielBatiment_Pub">' +
        '<wfs:Query typeNames="bat:Empreintes_batiments" srsName="' + $crs + '">' +
        '<fes:Filter><fes:Intersects><fes:ValueReference>GEOMETRIE</fes:ValueReference>' +
        $Geometry + '</fes:Intersects></fes:Filter>' +
        '<fes:SortBy><fes:SortProperty><fes:ValueReference>IDENTIFIANT</fes:ValueReference>' +
        '<fes:SortOrder>ASC</fes:SortOrder></fes:SortProperty></fes:SortBy>' +
        '</wfs:Query></wfs:GetFeature>'
    $response = Invoke-WebRequest -UseBasicParsing -Uri $wfs -Method Post `
        -ContentType 'application/xml; charset=utf-8' -Body ($utf8.GetBytes($xml)) -TimeoutSec 180
    if ($Hits) {
        [xml]$document = $response.Content
        $matched = $document.DocumentElement.GetAttribute('numberMatched')
        if ($matched -notmatch '^\d+$') { throw ('Invalid WFS count: ' + $response.Content.Substring(0, [Math]::Min(800, $response.Content.Length))) }
        return [int]$matched
    }
    if (-not $response.Content.TrimStart().StartsWith('{')) {
        throw ('WFS exception: ' + $response.Content.Substring(0, [Math]::Min(800, $response.Content.Length)))
    }
    return ($response.Content | ConvertFrom-Json)
}

$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
if (Test-Path -LiteralPath $OutputDirectory) {
    throw 'Choose a new output directory; incomplete or previous exports are never overwritten.'
}
[void][IO.Directory]::CreateDirectory($OutputDirectory)
$started = [DateTime]::UtcNow.ToString('o')

$boundary = Invoke-ArcQuery ($sda + '/1/query') @{
    f = 'geojson'; where = "MRS_CO_MRC = '$MrcCode'"
    outFields = 'MRS_CO_MRC,MRS_NM_MRC,MRS_CO_VER'; outSR = '4326'
}
if (@($boundary.features).Count -ne 1 -or (Get-Property $boundary 'exceededTransferLimit') -eq $true -or
    $boundary.features[0].properties.MRS_CO_MRC -ne $MrcCode) {
    throw 'Expected exactly one complete MRC boundary.'
}
Write-Json 'boundary.geojson' $boundary
$geometry = $boundary.features[0].geometry
if ($geometry.type -eq 'Polygon') {
    $gml = ConvertTo-GmlPolygon $geometry.coordinates
} elseif ($geometry.type -eq 'MultiPolygon') {
    $members = foreach ($polygon in $geometry.coordinates) {
        '<gml:surfaceMember>' + (ConvertTo-GmlPolygon $polygon) + '</gml:surfaceMember>'
    }
    $gml = '<gml:MultiSurface srsName="' + $crs + '">' + ($members -join '') + '</gml:MultiSurface>'
} else {
    throw ('Unsupported boundary geometry: ' + $geometry.type)
}

$territories = Invoke-ArcQuery ($sda + '/2/query') @{
    f = 'json'; where = "MUS_CO_MRC = '$MrcCode'"; returnGeometry = 'false'
    outFields = 'MUS_CO_GEO,MUS_NM_MUN'
}
if ((Get-Property $territories 'exceededTransferLimit') -eq $true -or @($territories.features).Count -eq 0) {
    throw 'Missing or truncated administrative territory inventory.'
}
$municipalities = @{}
foreach ($feature in $territories.features) {
    $a = $feature.attributes
    $municipalities[$a.MUS_CO_GEO] = [ordered]@{
        code = $a.MUS_CO_GEO; name = $a.MUS_NM_MUN
        addressRecords = 0; addressPoints = 0
    }
}

$filter = "CODE_MRC = '$MrcCode'"
$addressExpected = [int](Invoke-ArcQuery $rqa @{ f = 'json'; where = $filter; returnCountOnly = 'true' }).count
if ($addressExpected -le 0) { throw "No source addresses for MRC $MrcCode; empty-region export requires separate validation." }
$addresses = @{}
$addressIds = New-Object 'Collections.Generic.HashSet[string]'
$addressReceived = 0
$fields = 'IDENTIFIANT_UNIQUE_ADRESSE,NUMERO_MUNICIPAL,NUMERO_MUNICIPAL_SUFFIXE,ODONYME_RECOMPOSE_LONG,' +
    'CODE_MUNICIPALITE,NOM_MUNICIPALITE,QUALITE_POSITIONNEMENT_GEOMETRIQUE,' +
    'DATE_MODIFICATION,DATE_DIFFUSION_VERSION,LONGITUDE,LATITUDE'
$partitions = New-Object 'Collections.Generic.Queue[object]'
foreach ($code in ($municipalities.Keys | Sort-Object)) {
    $partitions.Enqueue(@{ code = $code; prefix = '' })
}
while ($partitions.Count -gt 0) {
    $partition = $partitions.Dequeue()
    $where = "$filter AND CODE_MUNICIPALITE = '$($partition.code)'"
    if ($partition.prefix) { $where += " AND IDENTIFIANT_UNIQUE_ADRESSE LIKE '$($partition.prefix)%'" }
    $page = Invoke-ArcQuery $rqa @{
        f = 'json'; where = $where; returnGeometry = 'false'
        outFields = $fields; resultRecordCount = $PageSize; orderByFields = 'IDENTIFIANT_UNIQUE_ADRESSE'
    }
    $features = @($page.features)
    if ((Get-Property $page 'exceededTransferLimit') -eq $true) {
        if ($features.Count -eq 0 -or $partition.prefix.Length -ge 32) { throw 'Cannot subdivide truncated address partition.' }
        # ESRI_OID and offset ordering are unstable on this service. Partition by its persistent ID instead.
        foreach ($digit in '0123456789abcdef'.ToCharArray()) {
            $partitions.Enqueue(@{ code = $partition.code; prefix = $partition.prefix + $digit })
        }
        continue
    }
    foreach ($feature in $features) {
        $a = $feature.attributes
        $addressId = [string]$a.IDENTIFIANT_UNIQUE_ADRESSE
        if ($addressId -notmatch '^[0-9a-f]{32}$' -or -not $addressIds.Add($addressId)) {
            throw 'Invalid or duplicate persistent address identifier.'
        }
        $position = @($a.LONGITUDE, $a.LATITUDE)
        Assert-Position $position
        $code = [string]$a.CODE_MUNICIPALITE
        if (-not $municipalities.ContainsKey($code)) { throw "Address territory absent from official boundary inventory: $code" }
        $municipalities[$code].addressRecords++
        $number = [string]$a.NUMERO_MUNICIPAL + [string]$a.NUMERO_MUNICIPAL_SUFFIXE
        $key = ConvertTo-Json -InputObject @($code, $number, $a.ODONYME_RECOMPOSE_LONG, $position[0], $position[1]) -Compress
        $modified = Get-DateText $a.DATE_MODIFICATION
        $version = Get-DateText $a.DATE_DIFFUSION_VERSION
        if (-not $addresses.ContainsKey($key)) {
            $addresses[$key] = [ordered]@{
                type = 'Feature'
                geometry = [ordered]@{ type = 'Point'; coordinates = $position }
                properties = [ordered]@{
                    number = $number; street = $a.ODONYME_RECOMPOSE_LONG
                    municipalityCode = $code; municipality = $a.NOM_MUNICIPALITE
                    quality = [string]$a.QUALITE_POSITIONNEMENT_GEOMETRIQUE
                    modified = $modified; version = $version
                }
            }
            $municipalities[$code].addressPoints++
        } else {
            $p = $addresses[$key].properties
            if ($p.version -ne $version) { throw 'Mixed address versions at a single point.' }
            $p.quality = ((@($p.quality -split '; ') + @([string]$a.QUALITE_POSITIONNEMENT_GEOMETRIQUE) |
                Sort-Object -Unique) -join '; ')
            if ($modified -gt $p.modified) { $p.modified = $modified }
        }
        $addressReceived++
    }
    Write-Host "Addresses: $addressReceived / $addressExpected source records"
}
$addressAfter = [int](Invoke-ArcQuery $rqa @{ f = 'json'; where = $filter; returnCountOnly = 'true' }).count
if ($addressReceived -ne $addressExpected -or $addressAfter -ne $addressExpected) {
    throw 'Address inventory changed or pagination was incomplete. No completion manifest written.'
}
$addressFeatures = @($addresses.Values | Sort-Object { $_.properties.municipalityCode }, { $_.properties.street }, { $_.properties.number })
Write-Json 'addresses.geojson' ([ordered]@{ type = 'FeatureCollection'; features = $addressFeatures })

$buildingExpected = Invoke-Buildings $gml 0 -Hits
if ($buildingExpected -le 0) { throw 'No source buildings intersecting the MRC.' }
Write-Host "Buildings intersecting the official MRC boundary: $buildingExpected"
$buildingFiles = New-Object 'Collections.Generic.List[string]'
$buildingVersions = @{}
$sourceDates = @{}
$qualities = @{}
$buildingReceived = 0
$lastBuilding = -1L
while ($buildingReceived -lt $buildingExpected) {
    $page = Invoke-Buildings $gml $buildingReceived
    $features = @($page.features)
    if ([string]$page.numberMatched -ne [string]$buildingExpected -or
        $features.Count -eq 0 -or $features.Count -ne [int]$page.numberReturned) {
        throw 'Incomplete building page or changed source inventory.'
    }
    $clean = foreach ($feature in $features) {
        $p = $feature.properties
        $id = [long]$p.IDENTIFIANT
        if ($id -le $lastBuilding) { throw 'Unstable or duplicate building pagination.' }
        $lastBuilding = $id
        if ($null -eq $feature.geometry -or $feature.geometry.type -notin @('Polygon', 'MultiPolygon')) {
            throw "Missing or invalid footprint: $id"
        }
        $polygons = $feature.geometry.coordinates
        if ($feature.geometry.type -eq 'Polygon') { $polygons = ,$polygons }
        foreach ($polygon in $polygons) {
            foreach ($ring in $polygon) {
                if ($ring.Count -lt 4) { throw "Invalid footprint ring: $id" }
                foreach ($position in $ring) { Assert-Position $position }
                if ($ring[0][0] -ne $ring[-1][0] -or $ring[0][1] -ne $ring[-1][1]) {
                    throw "Unclosed footprint ring: $id"
                }
            }
        }
        $buildingVersions[[string]$p.VERSION]++
        $sourceDates[[string]$p.DATE_SOURCE]++
        $qualities[[string]$p.NIVEAU_COMPLETUDE]++
        [ordered]@{
            type = 'Feature'; id = $id; geometry = $feature.geometry
            properties = [ordered]@{
                sourceId = $p.ID_BATIMENT; sourceDate = $p.DATE_SOURCE
                quality = $p.NIVEAU_COMPLETUDE; version = $p.VERSION
            }
        }
    }
    $file = 'buildings-{0:D5}.geojson' -f $buildingFiles.Count
    Write-Json $file ([ordered]@{ type = 'FeatureCollection'; features = @($clean) })
    $buildingFiles.Add($file)
    $buildingReceived += $features.Count
    Write-Host "Buildings: $buildingReceived / $buildingExpected"
}
if ($buildingReceived -ne $buildingExpected -or (Invoke-Buildings $gml 0 -Hits) -ne $buildingExpected) {
    throw 'Building inventory changed or pagination was incomplete. No completion manifest written.'
}
$files = @('boundary.geojson', 'addresses.geojson') + @($buildingFiles)
$checksums = foreach ($file in $files) {
    $path = Join-Path $OutputDirectory $file
    [ordered]@{ file = $file; bytes = (Get-Item -LiteralPath $path).Length; sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }
}
Write-Json 'manifest.json' ([ordered]@{
    schemaVersion = 1; complete = $true; mrcCode = $MrcCode
    mrcName = $boundary.features[0].properties.MRS_NM_MRC
    startedUtc = $started; completedUtc = [DateTime]::UtcNow.ToString('o')
    attribution = 'Gouvernement du Quebec - RQA, Referentiel quebecois sur les batiments, Decoupages administratifs'
    license = 'CC BY 4.0'; licenseUrl = 'https://creativecommons.org/licenses/by/4.0/'
    sources = [ordered]@{ addresses = $rqa; buildings = $wfs; boundary = $sda }
    boundaryVersion = $boundary.features[0].properties.MRS_CO_VER
    selection = "Addresses: CODE_MRC=$MrcCode. Buildings: exact INTERSECTS with the official MRC polygon, including holes; crossing footprints retained whole."
    limitations = 'Source inventory completeness is not real-world completeness or positional accuracy. No OSM deduplication, tiling, production integration or imagery freshness guarantee.'
    addresses = [ordered]@{
        sourceRecords = $addressReceived; points = $addressFeatures.Count
        grouping = 'Municipality, house number/suffix, street and exact coordinates; unit attributes excluded, quality values merged, latest modification retained.'
        versions = @($addressFeatures | ForEach-Object { $_.properties.version } | Sort-Object -Unique)
        territories = @($municipalities.Values | Sort-Object { $_.code }); file = 'addresses.geojson'
    }
    buildings = [ordered]@{
        count = $buildingReceived; files = @($buildingFiles)
        versions = $buildingVersions; sourceDates = $sourceDates; qualities = $qualities
    }
    files = @($checksums)
})
Write-Host "Complete, verified source export: $OutputDirectory"
