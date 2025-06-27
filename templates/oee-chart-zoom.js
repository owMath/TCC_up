// oee-chart-zoom.js
// Plugin para adicionar funcionalidade de zoom aos gráficos OEE

document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando plugin de zoom para gráficos OEE...');
    
    // Aguardar os gráficos originais serem inicializados
    setTimeout(function() {
        initChartZoom();
    }, 1500); // Aumentado o tempo para garantir que todos os gráficos estejam carregados
});

function initChartZoom() {
    // Verificar se o Chart.js está carregado
    if (typeof Chart === 'undefined') {
        console.error('Chart.js não encontrado! O plugin de zoom não pode ser inicializado.');
        return;
    }
    
    // Verificar se o objeto charts existe
    if (!window.charts) {
        console.error('Objeto charts não encontrado! O plugin de zoom não pode ser inicializado.');
        return;
    }
    
    console.log('Configurando plugins de zoom para os gráficos...');
    
    // Lista de gráficos para adicionar zoom
    const chartIds = ['oee', 'availability', 'performance'];
    
    // Propriedades de zoom a serem aplicadas
    const zoomOptions = {
        pan: {
            enabled: true,
            mode: 'x',
            threshold: 10
        },
        zoom: {
            wheel: {
                enabled: true,
            },
            pinch: {
                enabled: true
            },
            mode: 'x',
            drag: {
                enabled: true,
                backgroundColor: 'rgba(225,225,225,0.3)',
                borderColor: 'rgba(102,102,102,0.5)',
                borderWidth: 1
            }
        }
    };
    
    // Registrar o plugin Zoom
    registerZoomPlugin();
    
    // Aplicar zoom a cada gráfico
    chartIds.forEach(chartId => {
        applyZoomToChart(chartId, zoomOptions);
    });
    
    // Adicionar botões de controle de zoom
    addZoomControls();
}

// Registrar o plugin de Zoom para Chart.js
function registerZoomPlugin() {
    // Verificar se o plugin já está registrado
    if (Chart.registry.plugins.get('zoom')) {
        console.log('Plugin de zoom já registrado');
        return;
    }
    
    // Implementar um plugin básico de zoom para Chart.js
    const zoomPlugin = {
        id: 'zoom',
        
        beforeEvent(chart, args) {
            const event = args.event;
            
            // Detectar clique duplo para resetar zoom
            if (event.type === 'dblclick') {
                this.resetZoom(chart);
                return;
            }
            
            if (!chart.$zoom || !chart.$zoom.enabled) return;
            
            // Gerenciar estados de zoom e pan
            if (event.type === 'mousedown' && chart.$zoom.drag.enabled) {
                startDrag(chart, event);
            } else if (event.type === 'mousemove' && chart.$isDragging) {
                updateDrag(chart, event);
            } else if (event.type === 'mouseup' && chart.$isDragging) {
                endDrag(chart, event);
            } else if (event.type === 'wheel' && chart.$zoom.wheel.enabled) {
                handleZoomWheel(chart, event);
            }
        },
        
        resetZoom(chart) {
            const scales = chart.scales;
            Object.keys(scales).forEach(scaleId => {
                const scale = scales[scaleId];
                if (scale.originalOptions) {
                    scale.options.min = scale.originalOptions.min;
                    scale.options.max = scale.originalOptions.max;
                } else {
                    // Guardar as opções originais
                    scale.originalOptions = {
                        min: scale.options.min,
                        max: scale.options.max
                    };
                }
            });
            
            chart.update('active');
        }
    };
    
    // Registrar o plugin
    Chart.register(zoomPlugin);
    console.log('Plugin de zoom registrado com sucesso');
    
    // Implementar funções auxiliares de zoom
    function startDrag(chart, event) {
        const canvas = chart.canvas;
        
        chart.$isDragging = true;
        chart.$dragStart = {
            x: event.x,
            y: event.y
        };
        
        // Criar elemento de seleção
        const dragBox = document.createElement('div');
        dragBox.id = 'chart-dragbox';
        dragBox.style.position = 'absolute';
        dragBox.style.backgroundColor = chart.$zoom.drag.backgroundColor;
        dragBox.style.border = `1px solid ${chart.$zoom.drag.borderColor}`;
        dragBox.style.pointerEvents = 'none';
        
        // Posicionar sobre o canvas
        const rect = canvas.getBoundingClientRect();
        dragBox.style.left = `${event.x - rect.left}px`;
        dragBox.style.top = `${event.y - rect.top}px`;
        dragBox.style.width = '0px';
        dragBox.style.height = `${chart.chartArea.bottom - chart.chartArea.top}px`;
        
        // Adicionar ao container do canvas
        canvas.parentNode.style.position = 'relative';
        canvas.parentNode.appendChild(dragBox);
        
        chart.$dragBox = dragBox;
    }
    
    function updateDrag(chart, event) {
        if (!chart.$isDragging || !chart.$dragBox) return;
        
        const canvas = chart.canvas;
        const rect = canvas.getBoundingClientRect();
        const dragBox = chart.$dragBox;
        
        const width = event.x - chart.$dragStart.x;
        
        // Atualizar largura da caixa de seleção
        dragBox.style.width = `${Math.abs(width)}px`;
        if (width < 0) {
            dragBox.style.left = `${event.x - rect.left}px`;
        }
    }
    
    function endDrag(chart, event) {
        if (!chart.$isDragging || !chart.$dragBox) return;
        
        const dragBox = chart.$dragBox;
        const width = parseInt(dragBox.style.width);
        
        // Remover caixa de seleção
        dragBox.parentNode.removeChild(dragBox);
        chart.$dragBox = null;
        chart.$isDragging = false;
        
        // Se a seleção for muito pequena, ignorar
        if (width < 10) return;
        
        // Aplicar zoom à área selecionada
        const leftX = parseInt(dragBox.style.left);
        const rightX = leftX + width;
        
        // Converter posições do pixel para valores de dados
        const xScale = chart.scales.x;
        const minValue = xScale.getValueForPixel(leftX);
        const maxValue = xScale.getValueForPixel(rightX);
        
        // Guardar opções originais se necessário
        if (!xScale.originalOptions) {
            xScale.originalOptions = {
                min: xScale.options.min,
                max: xScale.options.max
            };
        }
        
        // Aplicar novo range
        xScale.options.min = minValue;
        xScale.options.max = maxValue;
        
        chart.update('active');
    }
    
    function handleZoomWheel(chart, event) {
        event.native.preventDefault();
        
        const xScale = chart.scales.x;
        
        // Guardar opções originais se necessário
        if (!xScale.originalOptions) {
            xScale.originalOptions = {
                min: xScale.options.min,
                max: xScale.options.max
            };
        }
        
        // Determinar ponto central do zoom
        const rect = event.native.target.getBoundingClientRect();
        const offsetX = event.x - rect.left;
        const centerValue = xScale.getValueForPixel(offsetX);
        
        // Determinar a direção e nível de zoom
        const wheelDelta = event.native.deltaY < 0 ? 0.8 : 1.25;
        
        // Calcular os novos limites
        const currentRange = xScale.max - xScale.min;
        const newRange = currentRange * wheelDelta;
        
        // Calcular novo min e max mantendo o ponto central proporcionalmente
        const centerRatio = (centerValue - xScale.min) / currentRange;
        const newMin = centerValue - newRange * centerRatio;
        const newMax = newMin + newRange;
        
        // Aplicar novos limites
        xScale.options.min = newMin;
        xScale.options.max = newMax;
        
        chart.update('active');
    }
}

// Aplicar configurações de zoom a um gráfico específico
function applyZoomToChart(chartId, zoomOptions) {
    const chart = window.charts[chartId];
    
    if (!chart) {
        console.error(`Gráfico com ID ${chartId} não encontrado`);
        return;
    }
    
    // Adicionar opções de zoom ao gráfico
    chart.$zoom = zoomOptions;
    
    // Adicionar tratamento de eventos
    const canvas = chart.canvas;
    
    // Garantir que não adicione eventos duplicados
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('dblclick', onDoubleClick);
    
    // Adicionar manipuladores de eventos
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel);
    canvas.addEventListener('dblclick', onDoubleClick);
    
    // Adicionar cursor especial
    canvas.style.cursor = 'pointer';
    
    console.log(`Zoom configurado para o gráfico ${chartId}`);
    
    // Manipuladores de eventos
    function onMouseDown(e) {
        chart.ctx.canvas.dispatchEvent(new CustomEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            clientX: e.clientX,
            clientY: e.clientY
        }));
    }
    
    function onMouseMove(e) {
        chart.ctx.canvas.dispatchEvent(new CustomEvent('mousemove', {
            bubbles: true,
            cancelable: true,
            clientX: e.clientX,
            clientY: e.clientY
        }));
    }
    
    function onMouseUp(e) {
        chart.ctx.canvas.dispatchEvent(new CustomEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            clientX: e.clientX,
            clientY: e.clientY
        }));
    }
    
    function onWheel(e) {
        e.preventDefault();
        chart.ctx.canvas.dispatchEvent(new CustomEvent('wheel', {
            bubbles: true,
            cancelable: true,
            deltaY: e.deltaY
        }));
    }
    
    function onDoubleClick(e) {
        chart.ctx.canvas.dispatchEvent(new CustomEvent('dblclick', {
            bubbles: true,
            cancelable: true
        }));
    }
}

// Adicionar botões de controle de zoom aos gráficos
function addZoomControls() {
    // IDs dos containers de gráficos
    const chartContainers = ['oee-chart', 'availability-chart', 'performance-chart'];
    
    chartContainers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Criar div para controles
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'chart-zoom-controls';
        controlsDiv.style.position = 'absolute';
        controlsDiv.style.top = '-40px';
        controlsDiv.style.right = '120px';
        controlsDiv.style.display = 'flex';
        controlsDiv.style.gap = '10px';
        controlsDiv.style.zIndex = '10';
        
        // Botão para resetar zoom
        const resetButton = document.createElement('button');
        resetButton.innerHTML = '<i class="fas fa-undo-alt"></i>';
        resetButton.title = 'Resetar Zoom';
        resetButton.style.border = 'none';
        resetButton.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
        resetButton.style.color = '#1a73e8';
        resetButton.style.borderRadius = '4px';
        resetButton.style.padding = '4px 8px';
        resetButton.style.cursor = 'pointer';
        resetButton.style.fontSize = '12px';
        resetButton.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
        
        // Botão para zoom in
        const zoomInButton = document.createElement('button');
        zoomInButton.innerHTML = '<i class="fas fa-search-plus"></i>';
        zoomInButton.title = 'Ampliar';
        zoomInButton.style.border = 'none';
        zoomInButton.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
        zoomInButton.style.color = '#1a73e8';
        zoomInButton.style.borderRadius = '4px';
        zoomInButton.style.padding = '4px 8px';
        zoomInButton.style.cursor = 'pointer';
        zoomInButton.style.fontSize = '12px';
        zoomInButton.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
        
        // Botão para zoom out
        const zoomOutButton = document.createElement('button');
        zoomOutButton.innerHTML = '<i class="fas fa-search-minus"></i>';
        zoomOutButton.title = 'Reduzir';
        zoomOutButton.style.border = 'none';
        zoomOutButton.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
        zoomOutButton.style.color = '#1a73e8';
        zoomOutButton.style.borderRadius = '4px';
        zoomOutButton.style.padding = '4px 8px';
        zoomOutButton.style.cursor = 'pointer';
        zoomOutButton.style.fontSize = '12px';
        zoomOutButton.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
        
        // Adicionar eventos
        resetButton.addEventListener('click', function() {
            const chartId = containerId === 'oee-chart' ? 'oee' : 
                           containerId === 'availability-chart' ? 'availability' : 'performance';
            
            const chart = window.charts[chartId];
            if (chart) {
                // Resetar zoom
                const zoomPlugin = Chart.registry.plugins.get('zoom');
                if (zoomPlugin) {
                    zoomPlugin.resetZoom(chart);
                }
            }
        });
        
        zoomInButton.addEventListener('click', function() {
            const chartId = containerId === 'oee-chart' ? 'oee' : 
                           containerId === 'availability-chart' ? 'availability' : 'performance';
            
            const chart = window.charts[chartId];
            if (chart) {
                // Aplicar zoom in (reduzir a faixa visível)
                const xScale = chart.scales.x;
                if (!xScale.originalOptions) {
                    xScale.originalOptions = {
                        min: xScale.options.min,
                        max: xScale.options.max
                    };
                }
                
                const range = xScale.max - xScale.min;
                const center = (xScale.max + xScale.min) / 2;
                const newRange = range * 0.7; // Zoom in de 30%
                
                xScale.options.min = center - (newRange / 2);
                xScale.options.max = center + (newRange / 2);
                
                chart.update('active');
            }
        });
        
        zoomOutButton.addEventListener('click', function() {
            const chartId = containerId === 'oee-chart' ? 'oee' : 
                           containerId === 'availability-chart' ? 'availability' : 'performance';
            
            const chart = window.charts[chartId];
            if (chart) {
                // Aplicar zoom out (aumentar a faixa visível)
                const xScale = chart.scales.x;
                if (!xScale.originalOptions) {
                    xScale.originalOptions = {
                        min: xScale.options.min,
                        max: xScale.options.max
                    };
                }
                
                const range = xScale.max - xScale.min;
                const center = (xScale.max + xScale.min) / 2;
                const newRange = range * 1.3; // Zoom out de 30%
                
                let newMin = center - (newRange / 2);
                let newMax = center + (newRange / 2);
                
                // Verificar limites originais para não extrapolar
                if (xScale.originalOptions) {
                    if (newMin < xScale.originalOptions.min) {
                        newMin = xScale.originalOptions.min;
                    }
                    if (newMax > xScale.originalOptions.max) {
                        newMax = xScale.originalOptions.max;
                    }
                }
                
                // Se chegou próximo dos limites originais, resetar zoom
                if (Math.abs(newMin - xScale.originalOptions.min) < 0.01 &&
                    Math.abs(newMax - xScale.originalOptions.max) < 0.01) {
                    const zoomPlugin = Chart.registry.plugins.get('zoom');
                    if (zoomPlugin) {
                        zoomPlugin.resetZoom(chart);
                        return;
                    }
                }
                
                xScale.options.min = newMin;
                xScale.options.max = newMax;
                
                chart.update('active');
            }
        });
        
        // Adicionar botões ao container de controles
        controlsDiv.appendChild(zoomInButton);
        controlsDiv.appendChild(zoomOutButton);
        controlsDiv.appendChild(resetButton);
        
        // Adicionar controles ao container do gráfico
        container.style.position = 'relative';
        container.appendChild(controlsDiv);
    });
    
    // Adicionar estilos globais para controles
    const style = document.createElement('style');
    style.textContent = `
        .chart-zoom-controls button:hover {
            background-color: rgba(255, 255, 255, 0.9) !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
        }
        
        #chart-dragbox {
            z-index: 9;
        }
        
        .chart-container {
            position: relative;
        }
    `;
    document.head.appendChild(style);
    
    console.log('Controles de zoom adicionados aos gráficos');
}

// Função para exibir instruções de uso
function showZoomInstructions() {
    // Criar modal de instruções
    const modal = document.createElement('div');
    modal.className = 'zoom-instructions-modal';
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.backgroundColor = 'white';
    modal.style.padding = '20px';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    modal.style.zIndex = '1000';
    modal.style.maxWidth = '400px';
    modal.style.width = '90%';
    
    modal.innerHTML = `
        <h3 style="margin-top: 0; color: #1a73e8;">Instruções de Zoom</h3>
        <p><b>Clique duplo:</b> Resetar zoom para exibição completa</p>
        <p><b>Roda do mouse:</b> Ampliar/reduzir no ponto do cursor</p>
        <p><b>Arrastar seleção:</b> Zoom em área específica</p>
        <p><b>Botões de controle:</b> Ampliar, reduzir e resetar zoom</p>
        <button id="close-zoom-instructions" style="background-color: #1a73e8; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; float: right;">Entendi</button>
        <div style="clear: both;"></div>
    `;
    
    // Adicionar overlay
    const overlay = document.createElement('div');
    overlay.className = 'zoom-instructions-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.zIndex = '999';
    
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    
    // Fechar no botão
    document.getElementById('close-zoom-instructions').addEventListener('click', function() {
        document.body.removeChild(modal);
        document.body.removeChild(overlay);
        
        // Salvar flag para não mostrar novamente
        localStorage.setItem('zoomInstructionsShown', 'true');
    });
    
    // Fechar no overlay
    overlay.addEventListener('click', function() {
        document.body.removeChild(modal);
        document.body.removeChild(overlay);
        
        // Salvar flag para não mostrar novamente
        localStorage.setItem('zoomInstructionsShown', 'true');
    });
}

// Função para mostrar instruções de zoom sem adicionar ícone de ajuda
function setupZoomInstructions() {
    // Mostrar instruções na primeira vez
    if (!localStorage.getItem('zoomInstructionsShown')) {
        setTimeout(showZoomInstructions, 1500);
    }
    
    // Adicionar botão de ajuda nos controles de zoom de cada gráfico em vez de no título
    const chartContainers = ['oee-chart', 'availability-chart', 'performance-chart'];
    
    chartContainers.forEach(containerId => {
        const controlsDiv = document.querySelector(`#${containerId} .chart-zoom-controls`);
        if (!controlsDiv) return;
        
        // Botão de ajuda
        const helpButton = document.createElement('button');
        helpButton.innerHTML = '<i class="fas fa-question"></i>';
        helpButton.title = 'Ajuda com Zoom';
        helpButton.style.border = 'none';
        helpButton.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
        helpButton.style.color = '#1a73e8';
        helpButton.style.borderRadius = '4px';
        helpButton.style.padding = '4px 8px';
        helpButton.style.cursor = 'pointer';
        helpButton.style.fontSize = '12px';
        helpButton.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
        helpButton.style.marginLeft = '5px';
        
        helpButton.addEventListener('click', showZoomInstructions);
        
        controlsDiv.appendChild(helpButton);
    });
}

// Iniciar após 2 segundos para garantir que tudo esteja carregado
setTimeout(function() {
    setupZoomInstructions();
}, 2000);