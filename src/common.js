import { getRhumbLineBearing } from 'geolib';
//机场坐标，业务这个应该是从数据里选的，这里方面测试写死了
export const airPortCoordinate = [108.95938654017978, 34.222197204782304, 0];

export const ICONSIZE = [32, 32];
export const MIDDLE_ICONSIZE = [20, 20];
export const ICONOFFSET = { x: 0, y: -16 };
export const LINECOLOR = '#FFFFFF';
export const LINEWIDTH = 2;
export const MAX_EXTENT = [108.95453409344537, 34.21569072322936, 108.96650083393185, 34.22526169733668];
export const MAXPITCH = 90;

const pi = Math.PI / 180;
const R = 6378137;

export function pointInExtent(point, extent) {
    point = formatCoordinate(point);
    const [lng, lat] = point;
    const [minx, miny, maxx, maxy] = extent;
    return lng >= minx && lng <= maxx && lat >= miny && lat <= maxy;
}

export function getExtentCenter(extent) {
    const [minx, miny, maxx, maxy] = extent;
    return [minx / 2 + maxx / 2, miny / 2 + maxy / 2];
}

export function extentToPoints(extent) {
    const [minx, miny, maxx, maxy] = extent;
    return [
        [minx, miny],
        [minx, maxy],
        [maxx, maxy],
        [maxx, miny]
    ];
}

export function toRadian(d) {
    return d * pi;
}

function measureLenBetween(c1, c2) {
    if (!c1 || !c2) {
        return 0;
    }
    let b = toRadian(c1[1]);
    const d = toRadian(c2[1]),
        e = b - d,
        f = toRadian(c1[0]) - toRadian(c2[0]);
    b = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(e / 2), 2) + Math.cos(b) * Math.cos(d) * Math.pow(Math.sin(f / 2), 2)));
    b *= R;
    return b;
}

export function coordinateEqual(c1, c2) {
    const x1 = c1[0], y1 = c1[1], z1 = c1[2];
    const x2 = c2[0], y2 = c2[1], z2 = c2[2];
    return x1 === x2 && y1 === y2 && z1 === z2;
}

/**
 * 两点之间的距离
 * @param {*} c1 
 * @param {*} c2 
 * @returns 
 */
export function calDistance(c1, c2) {
    const d = measureLenBetween(c1, c2);
    const dz = c2[2] - c1[2];
    if (dz === 0) {
        return d;
    }
    return Math.sqrt(d * d + dz * dz);
}

export function calBearing(c1, c2) {
    return getRhumbLineBearing(c1.slice(0, 2), c2.slice(0, 2)) + 3;
}


export function formatCoordinate(position) {
    if (Array.isArray(position)) {
        return position.slice(0, 3);
    }
    const { lng, lat, alt } = position;
    return [lng, lat, alt];
}

export function createLabel(coordinate, text) {
    let label = new DC.Label(coordinate, text + '')
    label.setStyle(getLabelStyle());
    return label;
}

export function getMiddleCoordiante(start, end) {
    const [x1, y1, z1] = start;
    const [x2, y2, z2] = end;
    return [(x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2];
}

export function getLabelStyle() {
    return {
        fillColor: DC.Color.fromCssColorString('#ffffff'),
        showBackground: true,
        backgroundColor: DC.Color.fromCssColorString('#000000'),
        font: '14px',
        pixelOffset: { x: 0, y: -46 }
    }

}

export function createBaseLayer(viewer) {
    let baseLayer = DC.ImageryLayerFactory.createImageryLayer(DC.ImageryType.ARCGIS, {
        url:
            'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
    })
    viewer.addBaseLayer(baseLayer, {
        iconUrl: 'examples/assets/icon/img.png',
        name: '影像'
    })
}

export function createTileSetLayer(viewer) {
    let tilesetLayer = new DC.TilesetLayer('tileset')
    viewer.addLayer(tilesetLayer)
    let tileset = new DC.Tileset(
        '//resource.dvgis.cn/data/3dtiles/dayanta/tileset.json'
    )
    tileset.setHeight(-420)
    tilesetLayer.addOverlay(tileset);
    return tileset;
}

