// oee-chart-pan.js
// Plugin para adicionar funcionalidade de pan (arraste) aos gráficos OEE

document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando plugin de pan para gráficos OEE...');
    
    // Aguardar os gráficos e o plugin de zoom serem inicializados
    setTimeout(function() {
        initChartPan();
    }, 2000); // Tempo suficiente para garantir que os gráficos e o zoom estejam carregados
});

function initChartPan() {
    // Verificar se o Chart.js está carregado
    if (typeof Chart === 'undefined') {
        console.error('Chart.js não encontrado! O plugin de pan não pode ser inicializado.');
        return;
    }
    
    // Verificar se o objeto charts existe
    if (!window.charts) {
        console.error('Objeto charts não encontrado! O plugin de pan não pode ser inicializado.');
        return;
    }
    
    console.log('Configurando recursos de pan para os gráficos...');
    
    // Lista de gráficos para adicionar pan
    const chartIds = ['oee', 'availability', 'performance'];
    
    // Aplicar funcionalidade de pan a cada gráfico
    chartIds.forEach(chartId => {
        applyPanToChart(chartId);
    });
    
    // Adicionar botões de controle de pan
    addPanControls();
}

// Aplicar funcionalidade de pan a um gráfico específico
function applyPanToChart(chartId) {
    const chart = window.charts[chartId];
    
    if (!chart) {
        console.error(`Gráfico com ID ${chartId} não encontrado`);
        return;
    }
    
    // Verificar se já existe configuração de zoom
    if (!chart.$zoom) {
        chart.$zoom = {
            pan: {
                enabled: false,
                mode: 'x',
                threshold: 10
            },
            zoom: {
                enabled: true,
                mode: 'x'
            }
        };
    }
    
    // Adicionar estado de pan ao gráfico
    chart.$panEnabled = false;
    chart.$panStartX = null;
    chart.$panStartY = null;
    
    // Adicionar manipuladores de eventos para o pan
    const canvas = chart.canvas;
    
    // Garantir que não adicione eventos duplicados
    canvas.removeEventListener('mousedown', onPanStart);
    canvas.removeEventListener('mousemove', onPanMove);
    canvas.removeEventListener('mouseup', onPanEnd);
    canvas.removeEventListener('mouseleave', onPanEnd);
    
    // Adicionar manipuladores de eventos
    canvas.addEventListener('mousedown', onPanStart);
    canvas.addEventListener('mousemove', onPanMove);
    canvas.addEventListener('mouseup', onPanEnd);
    canvas.addEventListener('mouseleave', onPanEnd);
    
    console.log(`Pan configurado para o gráfico ${chartId}`);
    
    // Manipuladores de eventos para pan
    function onPanStart(e) {
        if (!chart.$panEnabled) return;
        
        chart.$isPanning = true;
        chart.$panStartX = e.offsetX;
        
        // Mudar o cursor para indicar que está arrastando
        canvas.style.cursor = 'grabbing';
        
        // Impedir seleção de texto durante o arraste
        e.preventDefault();
    }
    
    function onPanMove(e) {
        if (!chart.$isPanning || !chart.$panEnabled) return;
        
        const deltaX = chart.$panStartX - e.offsetX;
        if (Math.abs(deltaX) < chart.$zoom.pan.threshold) return;
        
        const xScale = chart.scales.x;
        const range = xScale.max - xScale.min;
        
        // Calcular o deslocamento proporcional ao range atual
        const pixelRange = chart.chartArea.right - chart.chartArea.left;
        const valuePerPixel = range / pixelRange;
        const panAmount = deltaX * valuePerPixel;
        
        // Guardar as opções originais se necessário
        if (!xScale.originalOptions) {
            xScale.originalOptions = {
                min: xScale.options.min,
                max: xScale.options.max
            };
        }
        
        // Aplicar o deslocamento
        const newMin = xScale.min + panAmount;
        const newMax = xScale.max + panAmount;
        
        // Verificar limites
        if (xScale.originalOptions) {
            // Se tentar arrastar além dos limites originais, ajustar
            const originalRange = xScale.originalOptions.max - xScale.originalOptions.min;
            
            if (newMin < xScale.originalOptions.min) {
                const correction = xScale.originalOptions.min - newMin;
                xScale.options.min = xScale.originalOptions.min;
                xScale.options.max = newMax + correction;
                if (xScale.options.max > xScale.originalOptions.max) {
                    xScale.options.max = xScale.originalOptions.max;
                }
            } else if (newMax > xScale.originalOptions.max) {
                const correction = newMax - xScale.originalOptions.max;
                xScale.options.max = xScale.originalOptions.max;
                xScale.options.min = newMin - correction;
                if (xScale.options.min < xScale.originalOptions.min) {
                    xScale.options.min = xScale.originalOptions.min;
                }
            } else {
                xScale.options.min = newMin;
                xScale.options.max = newMax;
            }
        } else {
            xScale.options.min = newMin;
            xScale.options.max = newMax;
        }
        
        chart.update('active');
        
        // Atualizar a posição inicial para o próximo movimento
        chart.$panStartX = e.offsetX;
    }
    
    function onPanEnd(e) {
        if (!chart.$isPanning) return;
        
        chart.$isPanning = false;
        
        // Restaurar o cursor
        if (chart.$panEnabled) {
            canvas.style.cursor = 'grab';
        } else {
            canvas.style.cursor = 'pointer';
        }
    }
}

// Adicionar botões de controle de pan aos gráficos
function addPanControls() {
    // IDs dos containers de gráficos
    const chartContainers = ['oee-chart', 'availability-chart', 'performance-chart'];
    
    chartContainers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Buscar os controles de zoom existentes
        let controlsDiv = container.querySelector('.chart-zoom-controls');
        
        // Se não existirem, criar nova div
        if (!controlsDiv) {
            controlsDiv = document.createElement('div');
            controlsDiv.className = 'chart-zoom-controls';
            controlsDiv.style.position = 'absolute';
            controlsDiv.style.top = '-40px';
            controlsDiv.style.right = '120px';
            controlsDiv.style.display = 'flex';
            controlsDiv.style.gap = '10px';
            controlsDiv.style.zIndex = '10';
            
            container.style.position = 'relative';
            container.appendChild(controlsDiv);
        }
        
        // Botão para ativar/desativar o pan
        const panButton = document.createElement('button');
        panButton.innerHTML = '<i class="fas fa-hand-paper"></i>';
        panButton.title = 'Ativar/Desativar Arraste';
        panButton.className = 'pan-toggle-btn';
        panButton.style.border = 'none';
        panButton.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
        panButton.style.color = '#1a73e8';
        panButton.style.borderRadius = '4px';
        panButton.style.padding = '4px 8px';
        panButton.style.cursor = 'pointer';
        panButton.style.fontSize = '12px';
        panButton.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
        
        // Adicionar evento
        panButton.addEventListener('click', function() {
            const chartId = containerId === 'oee-chart' ? 'oee' : 
                           containerId === 'availability-chart' ? 'availability' : 'performance';
            
            const chart = window.charts[chartId];
            if (chart) {
                chart.$panEnabled = !chart.$panEnabled;
                
                // Atualizar estilo do botão
                if (chart.$panEnabled) {
                    panButton.style.backgroundColor = '#1a73e8';
                    panButton.style.color = 'white';
                    chart.canvas.style.cursor = 'grab';
                } else {
                    panButton.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
                    panButton.style.color = '#1a73e8';
                    chart.canvas.style.cursor = 'pointer';
                }
            }
        });
        
        // Adicionar botão de pan aos controles
        controlsDiv.appendChild(panButton);
    });
    
    // Não mostrar instruções automáticas
    handleZoomPanInstructions();
    
    console.log('Controles de pan adicionados aos gráficos');
}

// Função simplificada para não interferir com as instruções existentes
function handleZoomPanInstructions() {
    // Não mostrar instruções automáticas
    console.log('Instruções automáticas desativadas');
}