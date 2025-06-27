// oee-chart-navigation.js
// Script para adicionar controles explícitos de navegação aos gráficos OEE

document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando controles de navegação horizontal para gráficos OEE...');
    
    // Aguardar os gráficos serem inicializados
    setTimeout(function() {
        initChartNavigation();
    }, 2000); 
});

function initChartNavigation() {
    // Verificar se o Chart.js está carregado
    if (typeof Chart === 'undefined') {
        console.error('Chart.js não encontrado! Os controles de navegação não podem ser inicializados.');
        return;
    }
    
    // Verificar se o objeto charts existe
    if (!window.charts) {
        console.error('Objeto charts não encontrado! Os controles de navegação não podem ser inicializados.');
        return;
    }
    
    console.log('Configurando controles de navegação horizontal para os gráficos...');
    
    // Lista de gráficos para adicionar navegação
    const chartIds = ['oee', 'availability', 'performance'];
    
    // Aplicar funcionalidade de navegação a cada gráfico
    chartIds.forEach(chartId => {
        addNavigationControls(chartId);
    });
}

// Adicionar controles de navegação a um gráfico específico
function addNavigationControls(chartId) {
    const chart = window.charts[chartId];
    
    if (!chart) {
        console.error(`Gráfico com ID ${chartId} não encontrado`);
        return;
    }
    
    // Determinar o ID do container baseado no chartId
    const containerId = chartId === 'oee' ? 'oee-chart' : 
                        chartId === 'availability' ? 'availability-chart' : 
                        'performance-chart';
    
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} não encontrado`);
        return;
    }
    
    // Adicionar controles de navegação lateral (setas)
    addNavigationArrows(container, chart);
    
    // Modificar a função de pan existente (se houver)
    enhancePanFunctionality(chart);
    
    console.log(`Controles de navegação adicionados ao gráfico ${chartId}`);
}

// Adicionar setas de navegação laterais ao gráfico
function addNavigationArrows(container, chart) {
    // Criar container para as setas
    const arrowsContainer = document.createElement('div');
    arrowsContainer.className = 'chart-navigation-arrows';
    arrowsContainer.style.position = 'absolute';
    arrowsContainer.style.top = '-2%';
    arrowsContainer.style.width = '100%';
    arrowsContainer.style.display = 'flex';
    arrowsContainer.style.justifyContent = 'space-between'; // Espaçar as setas nas extremidades
    arrowsContainer.style.pointerEvents = 'none'; // Importante para não atrapalhar interação com o gráfico
    arrowsContainer.style.transform = 'translateY(-50%)';
    arrowsContainer.style.zIndex = '5';
    arrowsContainer.style.padding = '0 10px'; // Espaço nas laterais
    
    // Seta para esquerda
    const leftArrow = document.createElement('button');
    leftArrow.className = 'nav-arrow left-arrow';
    leftArrow.innerHTML = '<i class="fas fa-chevron-left"></i>';
    leftArrow.title = 'Deslocar para esquerda';
    leftArrow.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    leftArrow.style.color = '#1a73e8';
    leftArrow.style.border = 'none';
    leftArrow.style.borderRadius = '50%';
    leftArrow.style.width = '22px'; // Tamanho reduzido
    leftArrow.style.height = '22px'; // Tamanho reduzido
    leftArrow.style.cursor = 'pointer';
    leftArrow.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    leftArrow.style.display = 'flex';
    leftArrow.style.alignItems = 'center';
    leftArrow.style.justifyContent = 'center';
    leftArrow.style.pointerEvents = 'auto';
    leftArrow.style.fontSize = '12px'; // Tamanho da fonte reduzido para ficar proporcional
    leftArrow.style.position = 'absolute';
    leftArrow.style.left = '10px'; // Posicionado na lateral esquerda
    
    // Seta para direita
    const rightArrow = document.createElement('button');
    rightArrow.className = 'nav-arrow right-arrow';
    rightArrow.innerHTML = '<i class="fas fa-chevron-right"></i>';
    rightArrow.title = 'Deslocar para direita';
    rightArrow.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    rightArrow.style.color = '#1a73e8';
    rightArrow.style.border = 'none';
    rightArrow.style.borderRadius = '50%';
    rightArrow.style.width = '22px'; // Tamanho reduzido
    rightArrow.style.height = '22px'; // Tamanho reduzido
    rightArrow.style.cursor = 'pointer';
    rightArrow.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    rightArrow.style.display = 'flex';
    rightArrow.style.alignItems = 'center';
    rightArrow.style.justifyContent = 'center';
    rightArrow.style.pointerEvents = 'auto';
    rightArrow.style.fontSize = '12px'; // Tamanho da fonte reduzido para ficar proporcional
    rightArrow.style.position = 'absolute';
    rightArrow.style.right = '10px'; // Posicionado na lateral direita
    
    // Função para ajustar posicionamento responsivo
    function adjustArrowsPosition() {
        const containerWidth = container.clientWidth;
        
        if (containerWidth <= 480) { // Smartphones
            leftArrow.style.width = '20px';
            leftArrow.style.height = '20px';
            leftArrow.style.fontSize = '10px';
            leftArrow.style.left = '5px';
            
            rightArrow.style.width = '20px';
            rightArrow.style.height = '20px';
            rightArrow.style.fontSize = '10px';
            rightArrow.style.right = '5px';
        } else if (containerWidth <= 768) { // Tablets
            leftArrow.style.width = '22px';
            leftArrow.style.height = '22px';
            leftArrow.style.fontSize = '12px';
            leftArrow.style.left = '8px';
            
            rightArrow.style.width = '22px';
            rightArrow.style.height = '22px';
            rightArrow.style.fontSize = '12px';
            rightArrow.style.right = '8px';
        } else { // Desktop
            leftArrow.style.width = '22px';
            leftArrow.style.height = '22px';
            leftArrow.style.fontSize = '12px';
            leftArrow.style.left = '10px';
            
            rightArrow.style.width = '22px';
            rightArrow.style.height = '22px';
            rightArrow.style.fontSize = '12px';
            rightArrow.style.right = '10px';
        }
    }
    
    // Adicionar evento de navegação à esquerda
    leftArrow.addEventListener('click', function(e) {
        e.preventDefault();
        navigateChart(chart, 'left');
    });
    
    // Adicionar evento de navegação à direita
    rightArrow.addEventListener('click', function(e) {
        e.preventDefault();
        navigateChart(chart, 'right');
    });
    
    // Adicionar efeito de hover
    leftArrow.addEventListener('mouseover', function() {
        this.style.backgroundColor = 'rgba(26, 115, 232, 0.9)';
        this.style.color = 'white';
    });
    
    leftArrow.addEventListener('mouseout', function() {
        this.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
        this.style.color = '#1a73e8';
    });
    
    rightArrow.addEventListener('mouseover', function() {
        this.style.backgroundColor = 'rgba(26, 115, 232, 0.9)';
        this.style.color = 'white';
    });
    
    rightArrow.addEventListener('mouseout', function() {
        this.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
        this.style.color = '#1a73e8';
    });
    
    // Adicionar as setas ao container
    arrowsContainer.appendChild(leftArrow);
    arrowsContainer.appendChild(rightArrow);
    
    // Adicionar container de setas ao container do gráfico
    container.style.position = 'relative';
    container.appendChild(arrowsContainer);
    
    // Ajustar posicionamento inicialmente
    adjustArrowsPosition();
    
    // Adicionar listener para redimensionamento
    window.addEventListener('resize', adjustArrowsPosition);
}

// Navegação controlada do gráfico
function navigateChart(chart, direction) {
    const xScale = chart.scales.x;
    
    // Guardar opções originais se necessário
    if (!xScale.originalOptions) {
        xScale.originalOptions = {
            min: xScale.options.min,
            max: xScale.options.max
        };
    }
    
    // Calcular deslocamento (20% do range visível)
    const visibleRange = xScale.max - xScale.min;
    const shiftAmount = visibleRange * 0.2;
    
    // Aplicar deslocamento com base na direção
    if (direction === 'left') {
        // Deslocar para a esquerda (valores menores)
        let newMin = xScale.min - shiftAmount;
        let newMax = xScale.max - shiftAmount;
        
        // Verificar se não ultrapassa o limite mínimo
        if (xScale.originalOptions && newMin < xScale.originalOptions.min) {
            newMin = xScale.originalOptions.min;
            newMax = newMin + visibleRange;
        }
        
        xScale.options.min = newMin;
        xScale.options.max = newMax;
        
    } else if (direction === 'right') {
        // Deslocar para a direita (valores maiores)
        let newMin = xScale.min + shiftAmount;
        let newMax = xScale.max + shiftAmount;
        
        // Verificar se não ultrapassa o limite máximo
        if (xScale.originalOptions && newMax > xScale.originalOptions.max) {
            newMax = xScale.originalOptions.max;
            newMin = newMax - visibleRange;
        }
        
        xScale.options.min = newMin;
        xScale.options.max = newMax;
    }
    
    // Atualizar o gráfico
    chart.update('active');
}

// Melhorar funcionalidade de pan existente (se já existir)
function enhancePanFunctionality(chart) {
    // Se o gráfico já tiver configuração de pan
    if (chart.$zoom && chart.$zoom.pan) {
        // Melhorar a resposta do pan para torná-lo mais suave
        chart.$zoom.pan.threshold = 5; // Reduzir threshold para resposta mais rápida
        
        // Garantir que o pan está habilitado por padrão
        chart.$zoom.pan.enabled = true;
        
        // Se o gráfico tiver evento de pan, melhorar para deslocamento mais natural
        if (chart.canvas) {
            // Remover listeners existentes
            chart.canvas.removeEventListener('mousemove', onEnhancedPanMove);
            
            // Adicionar novo listener aprimorado
            chart.canvas.addEventListener('mousemove', onEnhancedPanMove);
            
            function onEnhancedPanMove(e) {
                if (!chart.$isPanning) return;
                
                // Aumentar a velocidade de deslocamento
                const deltaX = (chart.$panStartX - e.offsetX) * 1.5;
                
                // Chamar a função de navegação diretamente
                if (deltaX > 0) {
                    navigateChart(chart, 'left');
                } else if (deltaX < 0) {
                    navigateChart(chart, 'right');
                }
                
                // Atualizar a posição inicial para o próximo movimento
                chart.$panStartX = e.offsetX;
            }
        }
    }
}

// Adicionar controles de teclado para navegação
document.addEventListener('keydown', function(e) {
    // Verificar se existe um gráfico ativo
    if (!window.charts) return;
    
    // Navegar com setas do teclado
    if (e.key === 'ArrowLeft') {
        // Navegar todos os gráficos para a esquerda
        Object.values(window.charts).forEach(chart => {
            if (chart && chart.scales && chart.scales.x) {
                navigateChart(chart, 'left');
            }
        });
    } else if (e.key === 'ArrowRight') {
        // Navegar todos os gráficos para a direita
        Object.values(window.charts).forEach(chart => {
            if (chart && chart.scales && chart.scales.x) {
                navigateChart(chart, 'right');
            }
        });
    }
});