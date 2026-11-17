'use strict';

window.geoGooseRegionalMap = (function () {
  function createProtocol(world, regional) {
    return async function (request, controller) {
      var match = /^geogoose:\/\/(\d+)\/(\d+)\/(\d+)$/.exec(request.url);
      if (!match) throw new Error('Invalid GeoGoose vector tile URL.');
      var z = Number(match[1]), x = Number(match[2]), y = Number(match[3]);
      if (z > 15 || x >= Math.pow(2, z) || y >= Math.pow(2, z)) {
        throw new Error('Invalid GeoGoose vector tile coordinates.');
      }
      var signal = controller.signal;
      var tile;
      if (z >= 12) tile = await regional.getZxy(z, x, y, signal);
      if (!tile) tile = await world.getZxy(z, x, y, signal);
      return { data: tile ? tile.data : new ArrayBuffer(0) };
    };
  }
  return { createProtocol: createProtocol };
}());
