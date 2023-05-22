(function () {
    const vscode = acquireVsCodeApi();

    var myChart = echarts.init(document.getElementById('main'));
    option = {
        title: {
            text: "Stack Status:",
            top: "top",
            left: "center"
        },
        textStyle: {
            color: '#444',
            fontSize: 16,
            fontWeight: 600,
        },
        legend: [
            {
                tooltip: {
                    show: true
                },
                selectedMode: 'false',
                bottom: 20,
            }
        ],
        animationDuration: 500,
        animationEasingUpdate: 'quinticInOut',
        xAxis: {
            show: false,
            type: 'value'
        },
        yAxis: {
            show: false,
            type: 'value'
        },
        series: [
            {
                type: 'graph',
                coordinateSystem: 'cartesian2d',
                legendHoverLink: false,
                hoverAnimation: true,
                nodeScaleRatio: false,
                //箭头
                edgeSymbol: ['circle', 'none'],
                edgeSymbolSize: [2, 15],
                edgeLabel: {
                    show: false,
                    normal: {
                        show: true,
                        position: 'middle',
                        textStyle: {
                            fontSize: 12
                        },
                        formatter: "{c}"
                    }
                },
                focusNodeAdjacency: true,
                roam: false,
                //圆形上面的文字	
                label: {
                    normal: {
                        position: "bottom",
                        show: true,
                        textStyle: {
                            fontSize: 12
                        },
                    }
                },
                data: []
            },
            {
                type: 'lines',
                coordinateSystem: 'cartesian2d',
                effect: {
                    show: true,
                    smooth: true,
                    trailLength: 0,
                    symbol: "arrow",//箭头图标
                    symbolSize: 10,
                    period: 3,
                    delay: 1500,
                    loop: true,
                    lineStyle: {
                        width: 2,
                    }
                },
                lineStyle: {
                    width: 2,
                },
                data: []
            }
        ]
    };
    option && myChart.setOption(option);

    // Handle the message inside the webview
    window.addEventListener('message', event => {
        const message = event.data; // The JSON data our extension sent
        const statusSpan = /** @type {HTMLElement} */ (document.getElementById('statusSpan'));

        function getStackStatusColor(status) {
            switch (status) {
                case "syncing":
                    return "#FFA500";
                case "synced":
                    return "red";
                default:
                    return "black";
            }
        }

        switch (message.command) {
            case 'init':
                option.title.text = "Stack Status:" + " " + message.data.stack;
                statusSpan.innerText = message.data?.status;
                statusSpan.style.color = getStackStatusColor(message.data?.status);
                myChart.setOption(option);
                break;
            case 'update':
                operationInfo = message.data;
                console.log(operationInfo);
                // the messgae.data is of class OperationInfo
                // the message.data is like:
                // class OperationInfo {
                //     project: string;
                //     stack: string;
                //     status: StackStatus;
                //     resourceMap: {[name:string]: K8sResourceChange};
                // }
                // class K8sResourceChange {
                //     id: string;
                //     name: string;
                //     apiVersion: string;
                //     kind: string;
                //     namespace: string;
                //     status: ResourceStatus;
                //     dependsOn: string[] = [];
                // }
                // update the stack status info
                statusSpan.innerText = operationInfo?.status;

                if (!operationInfo.resourceMap) {
                    return;
                }
                resources = operationInfo.resourceMap;
                originalEdgeList = [];
                levelMap = {};

                function mostValue(arr, min) {
                    if (arr.length === 0) {
                        return 0;
                    }
                    var most = arr[0];
                    for (var i = 1; i < arr.length; i++) {
                        if ((min && arr[i] < most) || !min && arr[i] > most) {
                            most = arr[i];
                        }
                    }
                    return most;
                }

                function calculateLevel(id, resourceMap) {
                    // levelMap = {};
                    if (id in levelMap) {
                        return levelMap[id];
                    }
                    if (!resourceMap[id].dependsOn) {
                        levelMap[id] = 0;
                        return 0;
                    } else if (resourceMap[id].dependsOn.length === 0) {
                        levelMap[id] = 0;
                        return 0;
                    }
                    else {
                        const level = 1 + mostValue(
                            resourceMap[id].dependsOn.map((function (item) {
                                return calculateLevel(item, resourceMap);
                            })), false
                        );
                        levelMap[id] = level;
                        return level;
                    }
                }

                for (let id in resources) {
                    const res = resources[id];
                    // count the resouce's level(level means the minimum steps to reach the resource from start)
                    calculateLevel(id, resources);
                    // record edges to current resource
                    if (res.dependsOn) {
                        res.dependsOn.forEach((depend) => {
                            originalEdgeList.push({
                                'from': simpleName(resources[depend]),
                                'to': simpleName(res)
                            });
                        });
                    }
                }

                const maxLevel = mostValue(Object.keys(levelMap).map(key => levelMap[key]), false);
                // collect all the ids on each level from the levelMap.
                // the resOnEachLevel contains a map of level and the resource ids list at the level.
                const resOnEachLevel = {};
                for (let id in levelMap) {
                    const level = levelMap[id];
                    if (level in resOnEachLevel) {
                        resOnEachLevel[level].push(id);
                    } else {
                        resOnEachLevel[level] = [id];
                    }
                }
                // sort the resources in each level. sort by the resource's simple name. generate a map of simple name and its index & total id count on its level
                const resourceOrder = {};
                for (let level in resOnEachLevel) {
                    ids = resOnEachLevel[level];
                    simpleNames = ids.map((id) => { return simpleName(resources[id]); });
                    sorted = sortStringArray(simpleNames);
                    for (let index in sorted) {
                        resourceOrder[sorted[index]] = {
                            'index': index,
                            'total': sorted.length
                        };
                    }
                }

                // generate node list in the echarts
                nodeList = [];
                coordinateMap = {};
                for (let id in levelMap) {
                    const res = resources[id];
                    const simpleName = res.kind + '/' + res.name;
                    const xAxis = 600.0 / (maxLevel + 1) * levelMap[id] + 20;
                    const yAxis = 450 - 450.0 / (resourceOrder[simpleName]['total'] + 1) * resourceOrder[simpleName]['index'] + 20;

                    var resourceNode = {
                        name: simpleName,
                        symbolSize: 50,
                        symbol: 'circle',
                        draggable: false,
                        value: [xAxis, yAxis],
                        itemStyle: {
                            color: res.status === 'synced' ? 'green' : 'gray'
                        }
                    };
                    nodeList.push(resourceNode);
                    coordinateMap[simpleName] = [xAxis, yAxis];
                }


                // generate edge list in the echarts
                edgeList = originalEdgeList.map((e) => {
                    return {
                        coords: [
                            coordinateMap[e['from']],
                            coordinateMap[e['to']]
                        ]
                    };
                });

                option.series[0].data = nodeList;
                option.series[1].data = edgeList;
                console.log(option.series);
                myChart.setOption(option);
                break;
        }
    });

    function simpleName(res) {
        return res.kind + '/' + res.name;
    }

    // quick sort
    function sortStringArray(arr) {
        if (arr.length <= 1) {
            return arr;
        }

        const pivotIndex = Math.floor(arr.length / 2);
        const pivot = arr[pivotIndex];
        const left = [];
        const right = [];

        for (let i = 0; i < arr.length; i++) {
            if (i === pivotIndex) {
                continue;
            }

            if (arr[i] < pivot) {
                left.push(arr[i]);
            } else {
                right.push(arr[i]);
            }
        }

        return [...sortStringArray(left), pivot, ...sortStringArray(right)];
    }

}());