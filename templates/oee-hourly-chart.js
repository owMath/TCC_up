// Executar quando a página estiver totalmente carregada
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, aguardando inicialização dos gráficos originais...');
    
    // Dar tempo para os gráficos originais serem inicializados
    setTimeout(function() {
        console.log('Convertendo gráficos para exibição por hora do dia atual...');
        convertAllChartsToHourly();
    }, 100);
});

// Função principal para converter todos os gráficos para visualização horária
function convertAllChartsToHourly() {
    console.log('Iniciando conversão dos gráficos para exibição horária do dia atual');
    
    // Data atual
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const currentDay = currentDate.getDate();
    
    // Obter nome do mês atual em português
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const currentMonthName = monthNames[currentMonth];
    
    // Formatar a data atual como string para exibição
    const formattedDate = `${currentDay} de ${currentMonthName} de ${currentYear}`;
    
    // Labels para as horas do dia (de hora em hora)
    const hourlyLabels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    
    // Hora atual para limitar os dados exibidos até a hora atual
    const currentHour = currentDate.getHours();
    
    // Gerar dados somente até a hora atual + criar dados mais realistas por período do dia
    function generateHourlyData(baseValue, variation) {
        return Array.from({ length: 24 }, (_, hour) => {
            // Condições para tornar os dados mais realistas:
            // - Produtividade mais baixa de madrugada (00:00-05:00)
            // - Melhor desempenho pela manhã (08:00-12:00)
            // - Queda após o almoço (13:00-14:00)
            // - Recuperação à tarde (15:00-18:00)
            // - Gradual diminuição à noite (19:00-23:00)
            
            let periodFactor = 0;
            
            if (hour >= 0 && hour < 6) {
                // Madrugada - desempenho mais baixo
                periodFactor = -5;
            } else if (hour >= 8 && hour < 12) {
                // Período da manhã - melhor desempenho
                periodFactor = 5;
            } else if (hour >= 13 && hour < 15) {
                // Período após almoço - queda
                periodFactor = -2;
            } else if (hour >= 15 && hour < 19) {
                // Período da tarde - recuperação
                periodFactor = 3;
            } else if (hour >= 19) {
                // Noite - diminuição gradual
                periodFactor = -1;
            }
            
            // Ruído aleatório
            const noise = (Math.random() * variation) - (variation / 2);
            
            // Se a hora for futura em relação à hora atual, retornar null
            // Isso fará com que o gráfico mostre dados somente até a hora atual
            if (hour > currentHour) {
                return null;
            }
            
            // Valor final com limite mínimo e máximo
            return Math.min(100, Math.max(60, parseFloat((baseValue + periodFactor + noise).toFixed(1))));
        });
    }
    
    // Gerar dados para cada métrica com características ligeiramente diferentes
    const oeeData = generateHourlyData(81.7, 4); // OEE com base no valor atual
    const availabilityData = generateHourlyData(94.5, 3); // Disponibilidade com base no valor atual
    const performanceData = generateHourlyData(86.5, 3); // Performance com base no valor atual
    
    // Calcular médias apenas dos valores não nulos (horas já passadas)
    const calculateAverage = (data) => {
        const validData = data.filter(val => val !== null);
        return (validData.reduce((a, b) => a + b, 0) / validData.length).toFixed(1);
    };
    
    const avgOEE = calculateAverage(oeeData);
    const avgAvailability = calculateAverage(availabilityData);
    const avgPerformance = calculateAverage(performanceData);
    
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
        
        // Recriar o gráfico com foco na visualização horária
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
                    pointRadius: 3,
                    pointHoverRadius: 6
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
                                const hora = tooltipItems[0].label;
                                return `${hora} - ${formattedDate}`;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: `${title} (${formattedDate})`,
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
                            maxTicksLimit: 12,
                            callback: function(value, index) {
                                // Mostrar a cada 2 horas para melhor visualização
                                return index % 2 === 0 ? hourlyLabels[index] : '';
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Atualizar os três gráficos principais para visualização horária
    updateChart('oee-chart', 'oee', oeeData, hourlyLabels, 'OEE Total', '#1a73e8');
    updateChart('availability-chart', 'availability', availabilityData, hourlyLabels, 'Disponibilidade', '#0f9d58');
    updateChart('performance-chart', 'performance', performanceData, hourlyLabels, 'Performance', '#f4b400');
    
    console.log('Conversão para gráficos horários concluída com sucesso!');
}

// Não precisamos mais da função fixOEETrendChart, pois estamos focando
// apenas nos 3 gráficos principais de visualização diária/horária