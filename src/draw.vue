<script setup>
import * as DC from '@dvgis/dc-sdk';
import { onMounted, ref, reactive, onUnmounted } from 'vue';
import {
    getLabelStyle, createBaseLayer, createTileSetLayer,
    createTileSetLayerTest,
    airPortCoordinate, formatCoordinate, ICONSIZE,
    ICONOFFSET, LINECOLOR, LINEWIDTH, createLabel,
    getMiddleCoordiante, MIDDLE_ICONSIZE
} from './common';
import Flat from './tilesetFlat';

const mapcontainer = ref(null);

const state = reactive({
    lineData: []
})
let Cesium;
let viewer, plot, drawLayer, layer;
let tempLine, tempDashLine, points, middlePoints;
let flatTool;

//路线里添加默认的机场数据
state.lineData.push({
    coordinate: formatCoordinate(airPortCoordinate),
    name: '西安机场',
    altitude: 0,
    first: false,
    index: 0
})

//更新路线的数据
function updateLine(coordinate) {
    if (coordinate) {
        const item = {
            coordinate: coordinate,
            name: '',
            first: state.lineData.length === 1,
            altitude: coordinate[2],
            index: state.lineData.length
        }
        state.lineData.push(item);
    }
    [tempLine, tempDashLine].forEach(line => {
        if (line) {
            drawLayer.removeOverlay(line);
        }
    })

    //实线
    const lnglats = state.lineData.slice(1, Infinity).map(c => {
        return c.coordinate;
    })
    if (lnglats.length > 1) {
        tempLine = new DC.Polyline(lnglats);
        tempLine.setStyle({
            width: LINEWIDTH,
            material: DC.Color.fromCssColorString(LINECOLOR),
            // clampToGround: true
        })
        drawLayer.addOverlay(tempLine);
    }
    const lnglats1 = state.lineData.slice(0, 2).map(c => {
        return c.coordinate;
    })
    //虚线
    if (lnglats1.length) {
        tempDashLine = new DC.Polyline(lnglats1);
        tempDashLine.setStyle({
            width: LINEWIDTH,
            material: new DC.PolylineDashMaterialProperty({
                color: DC.Color.fromCssColorString(LINECOLOR),
            }),
            // clampToGround: true
        })
        drawLayer.addOverlay(tempDashLine);
    }
    if (points) {
        points.forEach(element => {
            drawLayer.removeOverlay(element);
        });

    }
    points = [];
    //点和标注
    state.lineData.slice(1, Infinity).forEach((c, index) => {
        const point = new DC.Billboard(c.coordinate, './icons/draw-icon.png');
        point.size = ICONSIZE;
        point.setStyle({
            pixelOffset: ICONOFFSET
        });
        point.attr = {
            index: c.index
        }
        point.on(DC.MouseEventType.RIGHT_CLICK, (e) => {
            if (e && e.overlay) {
                editPoint(e.overlay.attr);
            }
        })
        points.push(point);

        const label = createLabel(c.coordinate, index + 2);
        points.push(label);
    });
    drawLayer.addOverlays(points);
    updateMiddlePoints();
}

//中心点点击
function middlePointClick(e) {
    // console.log(e);
    if (e.overlay) {
        const attr = e.overlay.attr;
        const { endIndex } = attr;

        const coordinate = formatCoordinate(e.overlay.position);
        const item = {
            coordinate,
            name: '',
            first: false,
            altitude: coordinate[2]
        };
        state.lineData.splice(endIndex, 0, item);
        state.lineData.forEach((item, index) => {
            item.index = index;
        });
        console.log(state.lineData);
        updateLine();

    }
}

function updateMiddlePoints() {
    if (middlePoints) {
        middlePoints.forEach(element => {
            drawLayer.removeOverlay(element);
        });
    }
    middlePoints = [];
    const lineData = state.lineData;
    for (let i = 0, len = lineData.length; i < len - 1; i++) {
        const start = lineData[i].coordinate;
        const end = lineData[i + 1].coordinate;
        const middleCoordinate = getMiddleCoordiante(start, end);
        const middlePoint = new DC.Billboard(middleCoordinate, './icons/add.png');
        middlePoint.size = MIDDLE_ICONSIZE;
        middlePoint.attr.startIndex = i;
        middlePoint.attr.endIndex = i + 1;

        middlePoint.on(DC.MouseEventType.CLICK, middlePointClick);
        // middlePoint.setStyle({
        //     pixelOffset: ICONOFFSET
        // })
        middlePoints.push(middlePoint);
    }
    drawLayer.addOverlays(middlePoints);
}

function drawEnd() {
    plot.stop();
    plot._layer.clear();
}

//绘制顶点
function drawStart() {
    plot.draw('billboard', overlay => {
        console.log(overlay);
        // overlay.size = ICONSIZE;
        // overlay.setStyle({
        //     pixelOffset: ICONOFFSET
        // })
        // drawLayer.addOverlay(overlay);
        updateLine(formatCoordinate(overlay.position));
    }, {
        image: './icons/draw-icon.png',
        width: ICONSIZE[0],
        height: ICONSIZE[1],
        pixelOffset: ICONOFFSET
    }, true);
}

function editPoint(item) {
    const point = drawLayer.getOverlays().filter(g => {
        return g && g.attr && g.attr.index === item.index;
    })[0];
    if (point) {
        plot.edit(point, (overlay) => {
            const { index } = overlay.attr;
            const item = state.lineData[index];
            if (item) {
                state.lineData[index].coordinate = formatCoordinate(overlay.position);
                updateLine();
            }
        }, true);
    }
}

//添加默认机场
function addAirPort() {
    const airPort = new DC.Billboard(airPortCoordinate, './icons/airport.png');
    airPort.size = ICONSIZE;

    airPort.setStyle({
        pixelOffset: ICONOFFSET
    });

    layer.addOverlay(airPort);

    const label = createLabel(airPortCoordinate, 1);
    layer.addOverlay(label);

}

function clear() {
    drawLayer.clear();
    state.lineData = state.lineData.slice(0, 1);
}

const saveLineData = () => {
    console.log(JSON.stringify(state.lineData));
}
//压平3dtile
function flat3Dtile(tileset) {
    //经纬度边界
    const coordinates = [
        [120.66012318878829, 31.299229981057756, -0.019789444704101378]
        ,
        [120.66946095916448, 31.29880370268902, -0.019619747932695313]
        ,
        [120.66838918570947, 31.294087263558723, -0.0201230009447069]
        ,
        [120.6639462587578, 31.295697744127096, -0.019077814122802694]
        ,
        [120.66394339343844, 31.29666707954748, -0.021424744815436228]
        ,
        [120.65981405681158, 31.2968763046877, -0.02337918709302881]
    ];
    const positions = coordinates.map(c => {
        const p = new DC.Position(...c);
        return DC.Transform.transformWGS84ToCartesian(p)
    });
    // console.log(positions);
    flatTool.addRegion({
        positions: positions,
        id: new Date().getTime()
    });
}

function moveViewByOffset(direction) {
    // console.log(x, y);
    let x = 0, y = 0;
    if (direction === 'left') {
        x = 5;
      
    }
    if (direction === 'right') {
        x = -5;
    }
    if (direction === 'up') {
        y = 5;
    }
    if (direction === 'down') {
        y = -5;
    }

    viewer.camera.moveRight(x);
    viewer.camera.moveDown(y);


}

function init() {
    function initViewer() {
        console.log(mapcontainer.value);
        Cesium = DC.__namespace.Cesium;
        viewer = new DC.Viewer(mapcontainer.value);

        createBaseLayer(viewer);

        // const tileset = createTileSetLayer(viewer);

        const tileset = createTileSetLayerTest(viewer, (ctileset) => {
            // const offsetHeight = -22;
            // var cartographic = Cesium.Cartographic.fromCartesian(ctileset.boundingSphere.center);
            // var surface = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, offsetHeight);
            // var offset = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, offsetHeight);
            // var translation = Cesium.Cartesian3.subtract(offset, surface, new Cesium.Cartesian3());
            // tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation.clone());

            flatTool = new Flat(ctileset);
            flat3Dtile();
        });

        viewer.zoomTo(tileset);
        // window.viewer = viewer;
        viewer.on(DC.MouseEventType.CLICK, e => {
            // console.log(e);
            console.log(formatCoordinate(e.wgs84Position || e.wgs84SurfacePosition));
        })

        plot = new DC.Plot(viewer, {
            clampToModel: true
        });

        drawLayer = new DC.VectorLayer('drawLayer');
        viewer.addLayer(drawLayer);
        layer = new DC.VectorLayer('layer');
        viewer.addLayer(layer);
        addAirPort();

        // const view = new DC.Position(108.9596180737812, 34.21399014654956, 313);
        // viewer.flyToPosition(view);
    }
    DC.ready().then(initViewer)
}

onMounted(init);

onUnmounted(() => {
    if (viewer) {
        console.log('destroy viewer');
        viewer.destroy();
    }
})


</script>
<template>
    <div class="container">

        <div class="flex tools">
            <div class="tool-item">
                <button @click="drawStart">绘制</button>
            </div>
            <div class="tool-item">
                <button @click="clear">清空</button>
            </div>


            <!-- <button @click="drawEnd">结束</button> -->
        </div>
        <div class="flex main-container">

            <div class="line-data-panel">
                <div>
                    <button @click="moveViewByOffset('left')">左</button>
                    <button @click="moveViewByOffset('right')">右</button>
                    <button @click="moveViewByOffset('up')">上</button>
                    <button @click="moveViewByOffset('down')">下</button>
                </div>
                <div class="line-content">
                    <h4>路线数据</h4>
                    <button @click="saveLineData">保存数据</button>
                    <div class="data-row" v-for="(item, index) in state.lineData">
                        <div class="flex data-item">
                            <div class="data-label">{{ index + 1 }}.节点名称</div>
                            <div class="data-value">
                                <el-input v-model="item.name" size="small" />
                            </div>
                        </div>
                        <div class="flex data-item">
                            <div class="data-label">坐标</div>
                            <div class="data-value">
                                <el-input v-model="item.coordinate" size="small" disabled />
                            </div>
                        </div>
                        <div class="flex data-item">
                            <div class="data-label">高度</div>
                            <div class="data-value">
                                <el-input v-model="item.altitude" size="small" />
                            </div>
                        </div>
                        <div v-if="index > 0" class="flex data-item">
                            <div class="data-label">操作</div>
                            <div class="data-value">
                                <button @click="editPoint(item)">编辑</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="map-container" ref="mapcontainer"></div>
        </div>
    </div>
</template>

<style scoped>
.container {
    height: 100%;
}

.tools {
    /* position: absolute;
    z-index: 1;
    left: 0px; */
    /* padding-left: 100px; */
    /* background: white; */
    width: calc(100% - 2px);
    text-align: center;
    border: 1px solid #ebebeb;
    overflow: hidden;
}

.tool-item {
    padding-left: 10px;
}

.main-container {
    height: calc(100% - 26px);
}

.line-data-panel {
    /* position: absolute;
    z-index: 1; */
    width: 300px;
    height: 100%;
    overflow: auto;
    background-color: white;

}

.line-content {
    padding: 10px;
}


.data-row {
    border-bottom: 1px solid #dbdbdb;
    padding-bottom: 10px;
    margin-bottom: 10px;
}

.data-item {
    line-height: 24px;
}

.data-label {
    font-size: 12px;
    margin-right: 2px;
    width: 80px;
}

.map-container {
    width: calc(100% - 300px);
    height: 100%;
}
</style>
