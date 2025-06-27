// Executar quando a página estiver totalmente carregada
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, aguardando inicialização dos gráficos originais...');
    
    // Dar tempo para os gráficos originais serem inicializados
    setTimeout(function() {
        console.log('Convertendo gráficos para exibição diária...');
        convertAllChartsToDaily();
    }, 100);
});

// Função principal para converter todos os gráficos
function convertAllChartsToDaily() {
    console.log('Iniciando conversão dos gráficos para exibição diária');
    
    // Data atual
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Obter nome do mês atual em português
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const currentMonthName = monthNames[currentMonth];
    
    // Labels para os dias do mês atual (1, 2, 3, ..., 31)
    // CORREÇÃO: Agora usamos apenas os números dos dias para labels mais curtos
    const dailyLabels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
    
    // Gerar dados diários para o mês com padrões mais realistas
    function generateData(baseValue, variation, trend = 0) {
        // Definir alguns padrões realísticos (quedas nos fins de semana, melhorias graduais, etc)
        return Array.from({ length: daysInMonth }, (_, i) => {
            const dayOfWeek = new Date(currentYear, currentMonth, i + 1).getDay();
            const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
            
            // Componente de tendência (melhoria gradual ou queda)
            const trendFactor = (trend * i / daysInMonth);
            
            // Componente cíclico (padrão semanal)
            const cyclicFactor = isWeekend ? -2 : (dayOfWeek === 1 ? -1 : 0);
            
            // Ruído aleatório
            const noise = (Math.random() * variation) - (variation / 2);
            
            // Valor final com limite mínimo e máximo
            return Math.min(100, Math.max(60, parseFloat((baseValue + trendFactor + cyclicFactor + noise).toFixed(1))));
        });
    }
    
    // Gerar dados para cada métrica com tendências ligeiramente diferentes
    const oeeData = generateData(78, 4, 5); // OEE com tendência positiva
    const availabilityData = generateData(88, 3, 0); // Disponibilidade estável
    const performanceData = generateData(82, 3, 3); // Performance com leve tendência positiva
    
    // Calcular médias
    const avgOEE = (oeeData.reduce((a, b) => a + b, 0) / daysInMonth).toFixed(1);
    const avgAvailability = (availabilityData.reduce((a, b) => a + b, 0) / daysInMonth).toFixed(1);
    const avgPerformance = (performanceData.reduce((a, b) => a + b, 0) / daysInMonth).toFixed(1);
    
    // Atualizar valores nos cards
    document.getElementById('oee-total').textContent = avgOEE + '%';
    document.getElementById('availability').textContent = avgAvailability + '%';
    document.getElementById('performance').textContent = avgPerformance + '%';
    
    // Atualizar metas
    const metaOEEActual = document.querySelector('.goal-card:nth-child(1) .goal-value span:nth-child(2)');
    const metaDispActual = document.querySelector('.goal-card:nth-child(3) .goal-value span:nth-child(2)');
    if (metaOEEActual) metaOEEActual.textContent = `Atual: ${avgOEE}%`;
    if (metaDispActual) metaDispActual.textContent = `Atual: ${avgAvailability}%`;
    
    // Função para atualizar um gráfico
    function updateChart(containerId, chartKey, data, labels, title, color) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} não encontrado!`);
            return;
        }
        
        // Limpar o container
        container.innerHTML = '';
        
        // Criar novo canvas
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);
        
        // Destruir gráfico existente se houver
        if (window.charts && window.charts[chartKey]) {
            window.charts[chartKey].destroy();
        }
        
        // Recriar o gráfico com foco na visualização diária
        if (!window.charts) window.charts = {};
        
        window.charts[chartKey] = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: title,
                    data: data,
                    borderColor: color,
                    backgroundColor: 'transparent',
                    tension: 0.3,
                    pointRadius: 2,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return title + ': ' + context.raw + '%';
                            },
                            title: function(tooltipItems) {
                                // Mostrar o dia com o mês para clareza
                                const day = tooltipItems[0].label;
                                return `Dia ${day} de ${currentMonthName}`;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: `${title} - ${currentMonthName} ${currentYear}`,
                        font: { size: 14 }
                    }
                },
                scales: {
                    y: {
                        min: 60,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    },
                    x: {
                        ticks: {
                            autoSkip: true,
                            maxTicksLimit: 15
                        }
                    }
                }
            }
        });
    }
    
    // Atualizar os três gráficos principais para visualização diária
    updateChart('oee-chart', 'oee', oeeData, dailyLabels, 'OEE Total De 3 em 3 dias', '#1a73e8');
    updateChart('availability-chart', 'availability', availabilityData, dailyLabels, 'Disponibilidade De 3 em 3 dias', '#0f9d58');
    updateChart('performance-chart', 'performance', performanceData, dailyLabels, 'Performance De 3 em 3 dias', '#f4b400');
    
    // Ajustar o gráfico de tendência OEE para mostrar dias de 3 em 3
    setTimeout(fixOEETrendChart, 1000);
    
    console.log('Conversão para gráficos diários concluída com sucesso!');
}

// Função para ajustar o gráfico de tendência de OEE para mostrar dias de 3 em 3
function fixOEETrendChart() {
    console.log('Executando ajuste do gráfico de tendência OEE para intervalos de 3 dias...');
    
    // Verificar se charts está definido e se o gráfico oeeTrend existe
    if (!window.charts || !window.charts.oeeTrend) {
        console.error('Gráfico de tendência OEE não encontrado. Tentando novamente em 1 segundo...');
        setTimeout(fixOEETrendChart, 1000);
        return;
    }
    
    // Data atual para referência (março/2025)
    const currentYear = 2025;
    const currentMonth = 2; // 0-based: 2 = março
    const daysInMonth = 31; // Março tem 31 dias
    
    // Criar labels para dias de 3 em 3
    const newLabels = [];
    for (let day = 1; day <= daysInMonth; day += 3) {
        newLabels.push(`${day}/Mar`);
    }
    
    // Função para gerar dados simulados com tendência similar
    function generateDataWithTrend(baseValue, min, max, trend) {
        return newLabels.map((_, index) => {
            // Dia correspondente (multiplicado por 3 devido ao intervalo)
            const day = 1 + (index * 3);
            // Tendência suave ao longo do mês
            const trendFactor = (trend * (day / daysInMonth));
            // Pequena variação aleatória para naturalidade
            const noise = (Math.random() * 0.6) - 0.3;
            // Garantir que o valor final esteja dentro dos limites
            return Math.max(min, Math.min(max, parseFloat((baseValue + trendFactor + noise).toFixed(1))));
        });
    }
    
    // Gerar dados para cada métrica
    const oeeData = generateDataWithTrend(77, 75, 80, 2);         // OEE com leve tendência de alta
    const availabilityData = generateDataWithTrend(90, 88, 92, 1); // Disponibilidade estável
    const performanceData = generateDataWithTrend(85, 82, 88, 2);  // Performance com tendência de alta
    const qualityData = generateDataWithTrend(99, 98, 100, 0.5);   // Qualidade estável e alta
    
    // Atualizar os dados do gráfico
    const chart = window.charts.oeeTrend;
    
    // Atualizar labels
    chart.data.labels = newLabels;
    
    // Atualizar datasets
    chart.data.datasets[0].data = oeeData;
    chart.data.datasets[1].data = availabilityData;
    chart.data.datasets[2].data = performanceData;
    chart.data.datasets[3].data = qualityData;
    
    // Atualizar opções para melhorar a visualização
    chart.options.scales.x.ticks = {
        autoSkip: false, // Mostrar todos os labels
        maxRotation: 0   // Não rotacionar os labels
    };
    
    // Atualizar o título para indicar que são dados de 3 em 3 dias
    chart.options.plugins.title = {
        display: true,
        text: 'Tendência de OEE - Março 2025 (intervalos de 3 dias)',
        font: {size: 14}
    };
    
    // Aplicar as mudanças
    chart.update();
    
    console.log('Gráfico de tendência OEE ajustado com sucesso para intervalos de 3 dias!');
    
    // Também reajustar corretamente a legenda interativa se existir
    if (document.getElementById('oee-trend-legend')) {
        if (typeof createInteractiveLegend === 'function') {
            createInteractiveLegend('oee-trend-legend', chart);
        }
    }
}