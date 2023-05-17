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
        legend: [{
            formatter: function(name) {
                return echarts.format.truncateText(name, 200, '12px', '…');
            },
            tooltip: {
                show: true
            },
            selectedMode: 'false',
            bottom: 20,
        }],
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

        switch (message.command) {
            case 'init':
                option.title.text = "Stack Status:" + " " + message.data.stack;
                myChart.setOption(option);
            case 'update':
                text = message.data;
                // the messgae.data is a json string stringified from a list of resources
                console.log(text);
                resources = JSON.parse(text);
                nodeList = [];
                originalNodeMap = {};
                originalEdgeList = [];
                for (let i = 0; i < resources.length; i++) {
                    const resource = resources[i];
                    const resourceName = resource.kind + '/' + resource.name;
                    // record edges to current resource
                    resource.dependsOn.forEach((depend) => {
                        originalEdgeList.push({
                            'from': depend,
                            'to': resourceName
                        });
                    });
                    
                    originalNodeMap[resourceName] = {
                        name: resourceName,
                    };
                    var resourceNode = {
                        name: resource.kind + '/' + resource.name,
                        symbolSize: 50,
                        symbol: 'circle',
                        draggable: false,
                        value: [400/resources.length*i, 40],
                    };
                    nodeList.push(resourceNode);
                }
                option.series[0].data = nodeList;
                myChart.setOption(option);
                break;
        }
    });
}());