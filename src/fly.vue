<script setup>
import * as DC from '@dvgis/dc-sdk';
import { formatRouteData, RoutePlayer } from 'maptalks.routeplayer/dist/index';
import { onMounted, ref, reactive, onUnmounted } from 'vue';
import {
    getLabelStyle, createBaseLayer, createTileSetLayer,
    airPortCoordinate, formatCoordinate, ICONSIZE,
    ICONOFFSET, LINECOLOR, LINEWIDTH, createLabel,
    getMiddleCoordiante, MIDDLE_ICONSIZE, calDistance, calBearing,
    toRadian
} from './common';

const mapcontainer = ref(null);
const infopanel = ref(null);

const state = reactive({
    lineData: [],
    speed: 1,
    follow: true
});

//飞行实时信息
const infoState = reactive({
    speed: 0,
    stop: '',
    position: '',
    altitude: 0
})

let viewer, plot, drawLayer, layer, player, htmlLayer;
let tempLine, tempDashLine, points, model, divPanel;

let preTime, preCoordinate, preVertex;
let Cesium;

//飞行路线
function updateLine(coordinate) {
    [tempLine, tempDashLine].forEach(line => {
        if (line) {
            drawLayer.removeOverlay(line);
        }
    })

    //去掉第一个数据(机场)
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
    state.lineData.slice(1, Infinity).forEach((c, index) => {
        const point = new DC.Billboard(c.coordinate, './icons/draw-icon.png');
        point.size = ICONSIZE;
        point.setStyle({
            pixelOffset: ICONOFFSET
        });
        points.push(point);

        const label = createLabel(c.coordinate, c.name);
        points.push(label);
    });
    drawLayer.addOverlays(points);
}

//机场，注意这里写死的，坐标应该是选择的机场的坐标
function addAirPort() {
    const airPort = new DC.Billboard(airPortCoordinate, './icons/airport.png');
    airPort.size = ICONSIZE;

    airPort.setStyle({
        pixelOffset: ICONOFFSET
    });

    layer.addOverlay(airPort);

    const label = createLabel(airPortCoordinate, '西安机场');
    layer.addOverlay(label);



}
//无人机模型
function addModel() {
    model = new DC.Model(airPortCoordinate, './drone.glb');
    model.setStyle({
        scale: 3
    })
    layer.addOverlay(model);

    console.log(model);

    const cloneData = JSON.parse(JSON.stringify(state.lineData));
    cloneData.forEach(d => {
        d.coordinate[2] = d.altitude || d.coordinate[2];
    });
    const routeData = formatRouteData(cloneData, {
        duration: 1000 * 60 * 10 //飞行时间
    });
    //轨迹播放插件
    player = new RoutePlayer(routeData);
    //播放事件
    player.on('playing', e => {
        updateInfoPanel(e);
    });
    //顶点事件
    player.on('vertex', e => {
        preVertex = e.data.coordinate;
        updateInfoPanel(e);
    });
    player.on('playend', e => {
        removeLookAt();
    });

}
//信息框
function addInfoPanel() {
    divPanel = new DC.DivIcon(
        airPortCoordinate, infopanel.value
    )
    divPanel.setStyle({
        position: 'bottomright'
    })
    htmlLayer.addOverlay(divPanel)
    updateInfoPanel();
}

//实时更新信息框
function updateInfoPanel(e) {
    const time = Date.now();
    let coordinate;
    if (!e) {
        coordinate = player.getData()[0].coordinate;
        infoState.stop = player.getData()[0].name;
    } else {
        coordinate = e.coordinate;
        if (e.data && e.data.name) {
            infoState.stop = e.data.name;
        }
    }
    if (preCoordinate && preTime) {
        //实时速度计算
        const distance = calDistance(coordinate, preCoordinate);
        const dTime = time - preTime;
        const speed = distance / (dTime) * 1000;
        infoState.speed = isNaN(speed) ? 0 : Math.round(speed)

    } else {
        infoState.speed = 0;
    }
    if (preVertex && state.follow) {
        const bearing = calBearing(preVertex, coordinate);
        const { heading, roll, alt, pitch } = viewer.cameraPosition;
        const position = new DC.Position(coordinate[0], coordinate[1], 50);
        const destination = DC.Transform.transformWGS84ToCartesian(position);

        viewer.camera.lookAt(
            destination,
            new Cesium.HeadingPitchRange(
                toRadian(bearing),
                toRadian(pitch),
                200
            )
        )

        // viewer.scene.camera.setView({
        //     destination: destination, // 点的坐标
        //     orientation: {
        //         heading: toRadian(bearing),
        //         // pitch: toRadian(pitch),
        //         // roll: toRadian(roll)

        //     }
        // });
    }

    preCoordinate = coordinate;
    preTime = time;

    infoState.altitude = preCoordinate[2].toFixed(2);

    infoState.position = preCoordinate.slice(0, 2).map(v => {
        return v.toFixed(4);
    }).join(',');
    divPanel.position = preCoordinate;
    model.position = coordinate;
}

//获取路线数据
function getLineData() {
    fetch('./data.json').then(res => res.json()).then(json => {
        state.lineData = json;
        addAirPort();
        addModel();
        updateLine();
        addInfoPanel();
    })
}

function init() {
    function initViewer() {
        Cesium = DC.__namespace.Cesium;

        viewer = new DC.Viewer(mapcontainer.value);

        createBaseLayer(viewer);
        const tileset = createTileSetLayer(viewer);

        viewer.zoomTo(tileset)
        // window.viewer = viewer;
        viewer.on(DC.MouseEventType.CLICK, e => {
            console.log(e);
            console.log(formatCoordinate(e.wgs84Position || e.wgs84SurfacePosition));
        })

        plot = new DC.Plot(viewer, {
            clampToModel: true
        });

        drawLayer = new DC.VectorLayer('drawLayer');
        viewer.addLayer(drawLayer);
        layer = new DC.VectorLayer('layer');
        viewer.addLayer(layer);

        htmlLayer = new DC.HtmlLayer('htmllayer');
        viewer.addLayer(htmlLayer)

        getLineData();

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

const play = () => {
    if (!player) {
        return;
    }
    player.play();
}

const pause = () => {
    if (!player) {
        return;
    }
    player.pause();
}

function finish() {
    if (!player) {
        return;
    }
    player.finish();
}

function reset() {
    if (!player) {
        return;
    }
    player.reset();
    preVertex = null;
    preCoordinate = null;
    updateInfoPanel();

}

const updateSpeed = () => {
    if (!player) {
        return;
    }
    player.setSpeed(state.speed);
}

const removeLookAt = () => {
    if (viewer) {
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
    }
}


const followChange = () => {
    if (!state.follow) {
        removeLookAt();
    }
}

</script>
<template>
    <div class="container">
        <div class="info-panel">
            <div class="inofo-panel-content" ref="infopanel">
                <div class="flex data-item">
                    <div class="data-label">当前节点:</div>
                    <div class="data-value">
                        {{ infoState.stop }}
                    </div>
                </div>
                <div class="flex data-item">
                    <div class="data-label">飞行速度:</div>
                    <div class="data-value">
                        {{ infoState.speed }}M/S
                    </div>
                </div>
                <div class="flex data-item">
                    <div class="data-label">飞行高度:</div>
                    <div class="data-value">
                        {{ infoState.altitude }}M
                    </div>
                </div>
                <div class="flex data-item">
                    <div class="data-label">当前位置:</div>
                    <div class="data-value">
                        {{ infoState.position }}
                    </div>
                </div>

            </div>

        </div>
        <div class="flex tools">
            <div class="tool-item">
                <button @click="play">飞行</button>
            </div>
            <div class="tool-item">
                <button @click="pause">暂停</button>
            </div>
            <div class="tool-item">
                <button @click="finish">结束</button>
            </div>
            <div class="tool-item">
                <button @click="reset">重置</button>
            </div>
            <div class="flex tool-item" style="width:300px;">
                <span class="demonstration">倍速:</span>
                <el-slider v-model="state.speed" :min="1" :max="50" @change="updateSpeed" />
            </div>
            <div class="flex tool-item">

                <el-checkbox v-model="state.follow" @change="followChange">视角跟随</el-checkbox>
            </div>

            <!-- <button @click="drawEnd">结束</button> -->
        </div>
        <div class="flex main-container">
            <div class="line-data-panel">
                <div class="line-content">
                    <h4>路线数据</h4>
                    <div class="data-row" v-for="(item, index) in state.lineData">
                        <div class="flex data-item">
                            <div class="data-label">{{ index + 1 }}.节点名称</div>
                            <div class="data-value">
                                <el-input v-model="item.name" size="small" disabled />
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
                                <el-input v-model="item.altitude" size="small" disabled />
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
    border-bottom: 1px solid #f9f9f9;
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

.info-panel {
    display: none;
}

.inofo-panel-content {
    max-width: 300px;
    overflow-y: hidden;
    color: #fff;
    background-color: #072a6bbf;
    padding: 4px;
    border-radius: 6px;
}
</style>
<style>
.div-icon {
    background-color: transparent
}
</style>
