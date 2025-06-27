// Função para exportar um gráfico como PNG
function exportChartAsPNG(chartContainerId) {
    const chartContainer = document.getElementById(chartContainerId);
    if (!chartContainer) {
        console.error(`Container de gráfico não encontrado: ${chartContainerId}`);
        return;
    }
    
    // Encontrar o elemento canvas dentro do container
    const canvas = chartContainer.querySelector('canvas');
    if (!canvas) {
        console.error(`Canvas não encontrado no container: ${chartContainerId}`);
        return;
    }
    
    try {
        // Determinar o nome do arquivo baseado no ID do container
        let fileName = `oee-chart-${chartContainerId}-${getFormattedDate()}.png`;
        
        // Criar um link para download
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = fileName;
        
        // Adicionar à página, clicar e remover
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Mostrar feedback visual
        showExportNotification(`Gráfico exportado como ${fileName}`);
    } catch (error) {
        console.error(`Erro ao exportar gráfico como PNG: ${error.message}`);
        showExportNotification('Erro ao exportar gráfico', 'error');
    }
}

// Função para exportar dados de um gráfico como CSV
function exportChartAsCSV(chartContainerId) {
    // Validar se o ID do gráfico existe no objeto charts
    const chartName = getChartNameFromContainerId(chartContainerId);
    const chartInstance = charts[chartName];
    
    if (!chartInstance) {
        console.error(`Instância do gráfico não encontrada para: ${chartContainerId}`);
        showExportNotification('Não foi possível exportar os dados', 'error');
        return;
    }
    
    try {
        // Obter dados do gráfico
        const labels = chartInstance.data.labels;
        const datasets = chartInstance.data.datasets;
        
        if (!labels || !datasets || datasets.length === 0) {
            showExportNotification('O gráfico não contém dados para exportar', 'warning');
            return;
        }
        
        // Construir o conteúdo CSV
        let csvContent = 'data:text/csv;charset=utf-8,';
        
        // Primeira linha: cabeçalhos
        let headers = ['Labels'];
        datasets.forEach(dataset => {
            headers.push(dataset.label || 'Série');
        });
        csvContent += headers.join(',') + '\r\n';
        
        // Linhas de dados
        labels.forEach((label, i) => {
            let row = [label];
            datasets.forEach(dataset => {
                row.push(dataset.data[i]);
            });
            csvContent += row.join(',') + '\r\n';
        });
        
        // Criar um link para download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.href = encodedUri;
        link.download = `oee-data-${chartContainerId}-${getFormattedDate()}.csv`;
        
        // Adicionar à página, clicar e remover
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Mostrar feedback visual
        showExportNotification(`Dados exportados como CSV`);
    } catch (error) {
        console.error(`Erro ao exportar dados como CSV: ${error.message}`);
        showExportNotification('Erro ao exportar dados', 'error');
    }
}

// Função auxiliar para mapear IDs de container para nomes de gráficos no objeto charts
function getChartNameFromContainerId(containerId) {
    const mapping = {
        'oee-chart': 'oee',
        'availability-chart': 'availability',
        'performance-chart': 'performance',
        'oee-trend-chart': 'oeeTrend',
        'stops-chart': 'stops',
        'machine-oee-chart': 'machineOee',
        'production-chart-container': 'productionAnalysis',
        'stops-analysis-chart': 'stopsAnalysis',
        'scrap-analysis-chart': 'scrapAnalysis'
    };
    
    return mapping[containerId] || containerId;
}

// Função para formatar data atual para uso em nomes de arquivo
function getFormattedDate() {
    const now = new Date();
    return `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
}

// Função para mostrar notificação de exportação
function showExportNotification(message, type = 'success') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `export-notification notification-${type}`;
    notification.textContent = message;
    
    // Adicionar ícone baseado no tipo
    let icon = 'check-circle';
    if (type === 'error') icon = 'times-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    notification.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    
    // Aplicar estilos
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 15px';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '1000';
    notification.style.display = 'flex';
    notification.style.alignItems = 'center';
    notification.style.gap = '8px';
    notification.style.boxShadow = '0 3px 6px rgba(0,0,0,0.16)';
    notification.style.transition = 'opacity 0.3s, transform 0.3s';
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    
    // Definir cores com base no tipo
    if (type === 'success') {
        notification.style.backgroundColor = '#4CAF50';
        notification.style.color = 'white';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#F44336';
        notification.style.color = 'white';
    } else if (type === 'warning') {
        notification.style.backgroundColor = '#FF9800';
        notification.style.color = 'white';
    }
    
    // Adicionar ao DOM
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Função para adicionar botão de exportação geral no topo
function addGlobalExportButton() {
    // Encontrar o elemento header para posicionar o botão
    const header = document.querySelector('.header');
    if (!header) return;
    
    // Verificar se o botão já existe
    if (header.querySelector('.global-export-btn')) return;
    
    // Criar o botão
    const exportButton = document.createElement('div');
    exportButton.className = 'global-export-btn';
    exportButton.innerHTML = '<i class="fas fa-download"></i> Exportar Tudo';
    
    // Criar menu dropdown
    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'export-dropdown-menu';
    dropdownMenu.style.display = 'none';
    
    // Adicionar opções ao menu
    dropdownMenu.innerHTML = `
        <div class="export-option" id="export-all-png"><i class="fas fa-file-image"></i> Exportar todos como PNG</div>
        <div class="export-option" id="export-all-csv"><i class="fas fa-file-csv"></i> Exportar todos como CSV</div>
        <div class="export-option" id="export-full-report"><i class="fas fa-file-pdf"></i> Gerar relatório completo</div>
    `;
    
    // Adicionar eventos
    exportButton.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
    });
    
    // Fechar dropdown ao clicar fora
    document.addEventListener('click', function() {
        dropdownMenu.style.display = 'none';
    });
    
    // Prevenir fechamento ao clicar no menu
    dropdownMenu.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // Adicionar eventos para as opções
    exportButton.appendChild(dropdownMenu);
    
    // Adicionar à barra superior
    const userInfo = header.querySelector('.user-info');
    header.insertBefore(exportButton, userInfo);
    
    // Adicionar estilos
    const style = document.createElement('style');
    style.textContent = `
        .global-export-btn {
            display: flex;
            align-items: center;
            background-color: #1a73e8;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            position: relative;
            margin-right: 15px;
        }
        .global-export-btn i {
            margin-right: 8px;
        }
        .global-export-btn:hover {
            background-color: #0d62c7;
        }
        .export-dropdown-menu {
            position: absolute;
            top: 100%;
            left: 0;
            margin-top: 5px;
            background-color: white;
            border-radius: 4px;
            box-shadow: 0 3px 8px rgba(0,0,0,0.15);
            z-index: 100;
            min-width: 220px;
        }
        .export-option {
            padding: 8px 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
        }
        .export-option:hover {
            background-color: #f5f5f5;
        }
        .export-option i {
            margin-right: 8px;
            width: 16px;
        }
    `;
    document.head.appendChild(style);
    
    // Configurar eventos para as opções
    document.getElementById('export-all-png').addEventListener('click', exportAllAsPNG);
    document.getElementById('export-all-csv').addEventListener('click', exportAllAsCSV);
    document.getElementById('export-full-report').addEventListener('click', generateFullReport);
}

// Função para exportar todos os gráficos como PNG
function exportAllAsPNG() {
    // Encontrar todos os containers de gráficos
    const chartContainers = [
        'oee-chart', 'availability-chart', 'performance-chart', 
        'oee-trend-chart', 'stops-chart', 'machine-oee-chart',
        'production-chart-container', 'stops-analysis-chart', 'scrap-analysis-chart'
    ];
    
    let exportedCount = 0;
    
    // Criar um zip para armazenar todas as imagens
    const zip = new JSZip();
    const imgFolder = zip.folder("charts");
    
    // Iterar por cada container e exportar o gráfico
    chartContainers.forEach((containerId, index) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const canvas = container.querySelector('canvas');
        if (!canvas) return;
        
        // Obter dados da imagem
        const imgData = canvas.toDataURL('image/png').replace('data:image/png;base64,', '');
        
        // Adicionar ao zip
        imgFolder.file(`chart-${containerId}.png`, imgData, {base64: true});
        exportedCount++;
    });
    
    // Verificar se algum gráfico foi exportado
    if (exportedCount === 0) {
        showExportNotification('Nenhum gráfico encontrado para exportar', 'warning');
        return;
    }
    
    // Gerar o arquivo zip
    zip.generateAsync({type:"blob"})
    .then(function(content) {
        // Criar link para download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `oee-charts-${getFormattedDate()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showExportNotification(`${exportedCount} gráficos exportados como PNG em arquivo ZIP`);
    });
}

// Função para exportar todos os dados como CSV
function exportAllAsCSV() {
    let exportedCount = 0;
    const zip = new JSZip();
    const dataFolder = zip.folder("data");
    
    // Iterar por cada gráfico no objeto charts
    for (const chartName in charts) {
        const chartInstance = charts[chartName];
        if (!chartInstance || !chartInstance.data || !chartInstance.data.labels) continue;
        
        try {
            // Obter dados do gráfico
            const labels = chartInstance.data.labels;
            const datasets = chartInstance.data.datasets;
            
            if (!labels || !datasets || datasets.length === 0) continue;
            
            // Construir o conteúdo CSV
            let csvRows = [];
            
            // Primeira linha: cabeçalhos
            let headers = ['Labels'];
            datasets.forEach(dataset => {
                headers.push(dataset.label || 'Série');
            });
            csvRows.push(headers.join(','));
            
            // Linhas de dados
            labels.forEach((label, i) => {
                let row = [label];
                datasets.forEach(dataset => {
                    row.push(dataset.data[i]);
                });
                csvRows.push(row.join(','));
            });
            
            // Adicionar ao zip
            dataFolder.file(`data-${chartName}.csv`, csvRows.join('\r\n'));
            exportedCount++;
        } catch (error) {
            console.error(`Erro ao exportar dados do gráfico ${chartName}: ${error.message}`);
        }
    }
    
    // Verificar se algum dado foi exportado
    if (exportedCount === 0) {
        showExportNotification('Nenhum dado encontrado para exportar', 'warning');
        return;
    }
    
    // Gerar o arquivo zip
    zip.generateAsync({type:"blob"})
    .then(function(content) {
        // Criar link para download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `oee-data-${getFormattedDate()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showExportNotification(`Dados de ${exportedCount} gráficos exportados como CSV em arquivo ZIP`);
    });
}

// Função para gerar um relatório completo
function generateFullReport() {
    showExportNotification('Gerando relatório completo...', 'success');
    
    // Obter data atual formatada para o relatório
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth()+1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    
    // Criar conteúdo HTML para o relatório
    let reportContent = `
        <html>
        <head>
            <title>Relatório de OEE - ${formattedDate}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #1a73e8; }
                .chart-container { margin: 20px 0; page-break-inside: avoid; }
                .chart-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
                img { max-width: 100%; border: 1px solid #eee; }
                .report-header { display: flex; justify-content: space-between; align-items: center; }
                .metrics-container { margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px; }
                .metrics-table { width: 100%; border-collapse: collapse; }
                .metrics-table td { padding: 10px; text-align: center; }
                .metric-label { font-size: 14px; color: #666; }
                .metric-value { font-size: 24px; font-weight: bold; }
                .oee-value { color: #1a73e8; }
                .availability-value { color: #0f9d58; }
                .performance-value { color: #f4b400; }
                .quality-value { color: #db4437; }
            </style>
        </head>
        <body>
            <div class="report-header">
                <h1>Relatório de OEE - ${formattedDate}</h1>
                <div>Gerado em: ${today.toLocaleTimeString()}</div>
            </div>
            <p>Este relatório apresenta os principais indicadores de OEE da planta.</p>
    `;
    
    // Capturar dados de OEE atuais
    const oeeTotal = document.getElementById('oee-total')?.textContent || '78.5%';
    const availability = document.getElementById('availability')?.textContent || '92.3%';
    const performance = document.getElementById('performance')?.textContent || '85.1%';
    // Tenta encontrar o valor de qualidade, mas usa um padrão se não encontrar
    let quality = '99.0%';
    try {
        const machineCard = document.querySelector('.machine-card');
        if (machineCard) {
            const qualityElement = machineCard.querySelector('.metric:nth-child(4) .metric-value');
            if (qualityElement) {
                quality = qualityElement.textContent;
            }
        }
    } catch (e) {}
    
    reportContent += `
        <div class="metrics-container">
            <h2>Indicadores Atuais</h2>
            <table class="metrics-table">
                <tr>
                    <td style="width: 25%;">
                        <div class="metric-label">OEE Total</div>
                        <div class="metric-value oee-value">${oeeTotal}</div>
                    </td>
                    <td style="width: 25%;">
                        <div class="metric-label">Disponibilidade</div>
                        <div class="metric-value availability-value">${availability}</div>
                    </td>
                    <td style="width: 25%;">
                        <div class="metric-label">Performance</div>
                        <div class="metric-value performance-value">${performance}</div>
                    </td>
                    <td style="width: 25%;">
                        <div class="metric-label">Qualidade</div>
                        <div class="metric-value quality-value">${quality}</div>
                    </td>
                </tr>
            </table>
        </div>
    `;
    
    // Encontrar todos os containers de gráficos
    const chartContainers = [
        'oee-chart', 'availability-chart', 'performance-chart', 
        'oee-trend-chart', 'stops-chart', 'machine-oee-chart',
        'production-chart-container', 'stops-analysis-chart', 'scrap-analysis-chart'
    ];
    
    // Para cada gráfico, adicionar uma seção no relatório
    chartContainers.forEach((containerId, index) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const canvas = container.querySelector('canvas');
        if (!canvas) return;
        
        // Obter título do gráfico baseado no ID
        let chartTitle = "Gráfico " + (index + 1);
        if (containerId === 'oee-chart') chartTitle = "Evolução do OEE";
        if (containerId === 'availability-chart') chartTitle = "Evolução da Disponibilidade";
        if (containerId === 'performance-chart') chartTitle = "Evolução da Performance";
        if (containerId === 'oee-trend-chart') chartTitle = "Tendência de OEE";
        if (containerId === 'stops-chart') chartTitle = "Distribuição de Paradas";
        if (containerId === 'machine-oee-chart') chartTitle = "OEE por Máquina";
        if (containerId === 'production-chart-container') chartTitle = "Análise de Produção";
        if (containerId === 'stops-analysis-chart') chartTitle = "Análise de Paradas";
        if (containerId === 'scrap-analysis-chart') chartTitle = "Análise de Descartes";
        
        // Adicionar seção para este gráfico
        reportContent += `
            <div class="chart-container">
                <div class="chart-title">${chartTitle}</div>
                <img src="${canvas.toDataURL('image/png')}" alt="${chartTitle}">
            </div>
        `;
    });
    
    // Adicionar informações de máquinas
    reportContent += `
        <h2>Status das Máquinas</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Máquina</th>
                    <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">Status</th>
                    <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">OEE</th>
                    <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">Disponibilidade</th>
                    <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">Performance</th>
                    <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">Qualidade</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Obter dados das máquinas
    const machineCards = document.querySelectorAll('.machine-card');
    machineCards.forEach(card => {
        const machineName = card.querySelector('h3')?.textContent || 'N/A';
        const statusEl = card.querySelector('.machine-status');
        const status = statusEl?.textContent || 'N/A';
        const statusClass = statusEl?.className.includes('running') ? 'color: #0f9d58;' : 
                           statusEl?.className.includes('idle') ? 'color: #f4b400;' : 
                           statusEl?.className.includes('stopped') ? 'color: #d93025;' : '';
        
        const oeeEl = card.querySelector('.metric:nth-child(1) .metric-value');
        const availabilityEl = card.querySelector('.metric:nth-child(2) .metric-value');
        const performanceEl = card.querySelector('.metric:nth-child(3) .metric-value');
        const qualityEl = card.querySelector('.metric:nth-child(4) .metric-value');
        
        reportContent += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; text-align: left;">${machineName}</td>
                <td style="padding: 10px; text-align: center; font-weight: bold; ${statusClass}">${status}</td>
                <td style="padding: 10px; text-align: center;">${oeeEl?.textContent || 'N/A'}</td>
                <td style="padding: 10px; text-align: center;">${availabilityEl?.textContent || 'N/A'}</td>
                <td style="padding: 10px; text-align: center;">${performanceEl?.textContent || 'N/A'}</td>
                <td style="padding: 10px; text-align: center;">${qualityEl?.textContent || 'N/A'}</td>
            </tr>
        `;
    });
    
    // Fechar a tabela e o HTML
    reportContent += `
            </tbody>
        </table>
        <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
            Relatório gerado pelo Sistema OEE - ${formattedDate}
        </div>
        </body>
        </html>
    `;
    
    // Se a biblioteca html2pdf estiver disponível, usar para gerar PDF
    if (typeof html2pdf !== 'undefined') {
        // Criar um elemento para renderizar o conteúdo
        const element = document.createElement('div');
        element.innerHTML = reportContent;
        element.style.display = 'none';
        document.body.appendChild(element);
        
        // Configurar opções do PDF
        const opt = {
            margin: [10, 10],
            filename: `relatorio-oee-${getFormattedDate()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        // Gerar PDF
        html2pdf().set(opt).from(element).save().then(() => {
            document.body.removeChild(element);
            showExportNotification(`Relatório PDF gerado com sucesso`);
        });
    } else {
        // Fallback para HTML se html2pdf não estiver disponível
        const blob = new Blob([reportContent], {type: 'text/html'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio-oee-${getFormattedDate()}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showExportNotification(`Relatório HTML gerado com sucesso`);
    }
}

// Função para adicionar botões de exportação a cada gráfico
function addExportButtonsToCharts() {
    // Encontrar todos os containers de gráficos
    const chartContainers = [
        'oee-chart', 'availability-chart', 'performance-chart', 
        'oee-trend-chart', 'stops-chart', 'machine-oee-chart',
        'production-chart-container', 'stops-analysis-chart', 'scrap-analysis-chart'
    ];
    
    chartContainers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Verificar se o container já tem botões de exportação
        if (container.querySelector('.export-buttons')) return;
        
        // Criar um wrapper para os botões
        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'export-buttons';
        buttonWrapper.style.display = 'flex';
        buttonWrapper.style.justifyContent = 'flex-end';
        buttonWrapper.style.gap = '8px';
        buttonWrapper.style.marginTop = '8px';
        
        // Botão de exportar PNG
        const pngButton = document.createElement('button');
        pngButton.innerHTML = '<i class="fas fa-file-image"></i> PNG';
        pngButton.className = 'export-btn export-png';
        pngButton.setAttribute('data-chart', containerId);
        pngButton.addEventListener('click', function() {
            exportChartAsPNG(containerId);
        });
        
        // Botão de exportar CSV
        const csvButton = document.createElement('button');
        csvButton.innerHTML = '<i class="fas fa-file-csv"></i> CSV';
        csvButton.className = 'export-btn export-csv';
        csvButton.setAttribute('data-chart', containerId);
        csvButton.addEventListener('click', function() {
            exportChartAsCSV(containerId);
        });
        
        // Adicionar botões ao wrapper
        buttonWrapper.appendChild(pngButton);
        buttonWrapper.appendChild(csvButton);
        
        // Adicionar wrapper ao container
        container.appendChild(buttonWrapper);
    });
}   

// Função para exportar um gráfico como PNG
function exportChartAsPNG(chartContainerId) {
    const chartContainer = document.getElementById(chartContainerId);
    if (!chartContainer) {
        console.error(`Container de gráfico não encontrado: ${chartContainerId}`);
        return;
    }
    
    // Encontrar o elemento canvas dentro do container
    const canvas = chartContainer.querySelector('canvas');
    if (!canvas) {
        console.error(`Canvas não encontrado no container: ${chartContainerId}`);
        return;
    }
    
    try {
        // Determinar o nome do arquivo baseado no ID do container
        let fileName = `oee-chart-${chartContainerId}-${getFormattedDate()}.png`;
        
        // Criar um link para download
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = fileName;
        
        // Adicionar à página, clicar e remover
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Mostrar feedback visual
        showExportNotification(`Gráfico exportado como ${fileName}`);
    } catch (error) {
        console.error(`Erro ao exportar gráfico como PNG: ${error.message}`);
        showExportNotification('Erro ao exportar gráfico', 'error');
    }
}

// Função para exportar dados de um gráfico como CSV
function exportChartAsCSV(chartContainerId) {
    // Validar se o ID do gráfico existe no objeto charts
    const chartName = getChartNameFromContainerId(chartContainerId);
    const chartInstance = charts[chartName];
    
    if (!chartInstance) {
        console.error(`Instância do gráfico não encontrada para: ${chartContainerId}`);
        showExportNotification('Não foi possível exportar os dados', 'error');
        return;
    }
    
    try {
        // Obter dados do gráfico
        const labels = chartInstance.data.labels;
        const datasets = chartInstance.data.datasets;
        
        if (!labels || !datasets || datasets.length === 0) {
            showExportNotification('O gráfico não contém dados para exportar', 'warning');
            return;
        }
        
        // Construir o conteúdo CSV
        let csvContent = 'data:text/csv;charset=utf-8,';
        
        // Primeira linha: cabeçalhos
        let headers = ['Labels'];
        datasets.forEach(dataset => {
            headers.push(dataset.label || 'Série');
        });
        csvContent += headers.join(',') + '\r\n';
        
        // Linhas de dados
        labels.forEach((label, i) => {
            let row = [label];
            datasets.forEach(dataset => {
                row.push(dataset.data[i]);
            });
            csvContent += row.join(',') + '\r\n';
        });
        
        // Criar um link para download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.href = encodedUri;
        link.download = `oee-data-${chartContainerId}-${getFormattedDate()}.csv`;
        
        // Adicionar à página, clicar e remover
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Mostrar feedback visual
        showExportNotification(`Dados exportados como CSV`);
    } catch (error) {
        console.error(`Erro ao exportar dados como CSV: ${error.message}`);
        showExportNotification('Erro ao exportar dados', 'error');
    }
}

// Função auxiliar para mapear IDs de container para nomes de gráficos no objeto charts
function getChartNameFromContainerId(containerId) {
    const mapping = {
        'oee-chart': 'oee',
        'availability-chart': 'availability',
        'performance-chart': 'performance',
        'oee-trend-chart': 'oeeTrend',
        'stops-chart': 'stops',
        'machine-oee-chart': 'machineOee',
        'production-chart-container': 'productionAnalysis',
        'stops-analysis-chart': 'stopsAnalysis',
        'scrap-analysis-chart': 'scrapAnalysis'
    };
    
    return mapping[containerId] || containerId;
}

// Função para formatar data atual para uso em nomes de arquivo
function getFormattedDate() {
    const now = new Date();
    return `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
}

// Função para mostrar notificação de exportação
function showExportNotification(message, type = 'success') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `export-notification notification-${type}`;
    notification.textContent = message;
    
    // Adicionar ícone baseado no tipo
    let icon = 'check-circle';
    if (type === 'error') icon = 'times-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    notification.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    
    // Aplicar estilos
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 15px';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '1000';
    notification.style.display = 'flex';
    notification.style.alignItems = 'center';
    notification.style.gap = '8px';
    notification.style.boxShadow = '0 3px 6px rgba(0,0,0,0.16)';
    notification.style.transition = 'opacity 0.3s, transform 0.3s';
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    
    // Definir cores com base no tipo
    if (type === 'success') {
        notification.style.backgroundColor = '#4CAF50';
        notification.style.color = 'white';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#F44336';
        notification.style.color = 'white';
    } else if (type === 'warning') {
        notification.style.backgroundColor = '#FF9800';
        notification.style.color = 'white';
    }
    
    // Adicionar ao DOM
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Função para adicionar botão de exportação geral no topo
function addGlobalExportButton() {
    // Encontrar o elemento header para posicionar o botão
    const header = document.querySelector('.header');
    if (!header) return;
    
    // Verificar se o botão já existe
    if (header.querySelector('.global-export-btn')) return;
    
    // Criar o botão
    const exportButton = document.createElement('div');
    exportButton.className = 'global-export-btn';
    exportButton.innerHTML = '<i class="fas fa-download"></i> Exportar Tudo';
    
    // Criar menu dropdown
    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'export-dropdown-menu';
    dropdownMenu.style.display = 'none';
    
    // Adicionar opções ao menu
    dropdownMenu.innerHTML = `
        <div class="export-option" id="export-all-png"><i class="fas fa-file-image"></i> Exportar todos como PNG</div>
        <div class="export-option" id="export-all-csv"><i class="fas fa-file-csv"></i> Exportar todos como CSV</div>
        <div class="export-option" id="export-full-report"><i class="fas fa-file-pdf"></i> Gerar relatório completo</div>
    `;
    
    // Adicionar eventos
    exportButton.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
    });
    
    // Fechar dropdown ao clicar fora
    document.addEventListener('click', function() {
        dropdownMenu.style.display = 'none';
    });
    
    // Prevenir fechamento ao clicar no menu
    dropdownMenu.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // Adicionar eventos para as opções
    exportButton.appendChild(dropdownMenu);
    
    // Adicionar à barra superior
    const userInfo = header.querySelector('.user-info');
    header.insertBefore(exportButton, userInfo);
    
    // Adicionar estilos
    const style = document.createElement('style');
    style.textContent = `
        .global-export-btn {
            display: flex;
            align-items: center;
            background-color: #1a73e8;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            position: relative;
            margin-right: 15px;
        }
        .global-export-btn i {
            margin-right: 8px;
        }
        .global-export-btn:hover {
            background-color: #0d62c7;
        }
        .export-dropdown-menu {
            position: absolute;
            top: 100%;
            left: 0;
            margin-top: 5px;
            background-color: white;
            border-radius: 4px;
            box-shadow: 0 3px 8px rgba(0,0,0,0.15);
            z-index: 100;
            min-width: 220px;
        }
        .export-option {
            padding: 8px 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
        }
        .export-option:hover {
            background-color: #f5f5f5;
        }
        .export-option i {
            margin-right: 8px;
            width: 16px;
        }
    `;
    document.head.appendChild(style);
    
    // Configurar eventos para as opções
    document.getElementById('export-all-png').addEventListener('click', exportAllAsPNG);
    document.getElementById('export-all-csv').addEventListener('click', exportAllAsCSV);
    document.getElementById('export-full-report').addEventListener('click', generateFullReport);
}

// Função para exportar todos os gráficos como PNG
function exportAllAsPNG() {
    // Encontrar todos os containers de gráficos
    const chartContainers = [
        'oee-chart', 'availability-chart', 'performance-chart', 
        'oee-trend-chart', 'stops-chart', 'machine-oee-chart',
        'production-chart-container', 'stops-analysis-chart', 'scrap-analysis-chart'
    ];
    
    let exportedCount = 0;
    
    // Criar um zip para armazenar todas as imagens
    const zip = new JSZip();
    const imgFolder = zip.folder("charts");
    
    // Iterar por cada container e exportar o gráfico
    chartContainers.forEach((containerId, index) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const canvas = container.querySelector('canvas');
        if (!canvas) return;
        
        // Obter dados da imagem
        const imgData = canvas.toDataURL('image/png').replace('data:image/png;base64,', '');
        
        // Adicionar ao zip
        imgFolder.file(`chart-${containerId}.png`, imgData, {base64: true});
        exportedCount++;
    });
    
    // Verificar se algum gráfico foi exportado
    if (exportedCount === 0) {
        showExportNotification('Nenhum gráfico encontrado para exportar', 'warning');
        return;
    }
    
    // Gerar o arquivo zip
    zip.generateAsync({type:"blob"})
    .then(function(content) {
        // Criar link para download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `oee-charts-${getFormattedDate()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showExportNotification(`${exportedCount} gráficos exportados como PNG em arquivo ZIP`);
    });
}

// Função para exportar todos os dados como CSV
function exportAllAsCSV() {
    let exportedCount = 0;
    const zip = new JSZip();
    const dataFolder = zip.folder("data");
    
    // Iterar por cada gráfico no objeto charts
    for (const chartName in charts) {
        const chartInstance = charts[chartName];
        if (!chartInstance || !chartInstance.data || !chartInstance.data.labels) continue;
        
        try {
            // Obter dados do gráfico
            const labels = chartInstance.data.labels;
            const datasets = chartInstance.data.datasets;
            
            if (!labels || !datasets || datasets.length === 0) continue;
            
            // Construir o conteúdo CSV
            let csvRows = [];
            
            // Primeira linha: cabeçalhos
            let headers = ['Labels'];
            datasets.forEach(dataset => {
                headers.push(dataset.label || 'Série');
            });
            csvRows.push(headers.join(','));
            
            // Linhas de dados
            labels.forEach((label, i) => {
                let row = [label];
                datasets.forEach(dataset => {
                    row.push(dataset.data[i]);
                });
                csvRows.push(row.join(','));
            });
            
            // Adicionar ao zip
            dataFolder.file(`data-${chartName}.csv`, csvRows.join('\r\n'));
            exportedCount++;
        } catch (error) {
            console.error(`Erro ao exportar dados do gráfico ${chartName}: ${error.message}`);
        }
    }
    
    // Verificar se algum dado foi exportado
    if (exportedCount === 0) {
        showExportNotification('Nenhum dado encontrado para exportar', 'warning');
        return;
    }
    
    // Gerar o arquivo zip
    zip.generateAsync({type:"blob"})
    .then(function(content) {
        // Criar link para download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `oee-data-${getFormattedDate()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showExportNotification(`Dados de ${exportedCount} gráficos exportados como CSV em arquivo ZIP`);
    });
}

// Função para gerar um relatório completo
function generateFullReport() {
    showExportNotification('Gerando relatório completo...', 'success');
    
    // Obter data atual formatada para o relatório
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth()+1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    
    // Criar conteúdo HTML para o relatório
    let reportContent = `
        <html>
        <head>
            <title>Relatório de OEE - ${formattedDate}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #1a73e8; }
                .chart-container { margin: 20px 0; page-break-inside: avoid; }
                .chart-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
                img { max-width: 100%; border: 1px solid #eee; }
                .report-header { display: flex; justify-content: space-between; align-items: center; }
                .metrics-container { margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px; }
                .metrics-table { width: 100%; border-collapse: collapse; }
                .metrics-table td { padding: 10px; text-align: center; }
                .metric-label { font-size: 14px; color: #666; }
                .metric-value { font-size: 24px; font-weight: bold; }
                .oee-value { color: #1a73e8; }
                .availability-value { color: #0f9d58; }
                .performance-value { color: #f4b400; }
                .quality-value { color: #db4437; }
            </style>
        </head>
        <body>
            <div class="report-header">
                <h1>Relatório de OEE - ${formattedDate}</h1>
                <div>Gerado em: ${today.toLocaleTimeString()}</div>
            </div>
            <p>Este relatório apresenta os principais indicadores de OEE da planta.</p>
    `;
    
    // Capturar dados de OEE atuais
    const oeeTotal = document.getElementById('oee-total')?.textContent || '78.5%';
    const availability = document.getElementById('availability')?.textContent || '92.3%';
    const performance = document.getElementById('performance')?.textContent || '85.1%';
    // Tenta encontrar o valor de qualidade, mas usa um padrão se não encontrar
    let quality = '99.0%';
    try {
        const machineCard = document.querySelector('.machine-card');
        if (machineCard) {
            const qualityElement = machineCard.querySelector('.metric:nth-child(4) .metric-value');
            if (qualityElement) {
                quality = qualityElement.textContent;
            }
        }
    } catch (e) {}
    
    reportContent += `
        <div class="metrics-container">
            <h2>Indicadores Atuais</h2>
            <table class="metrics-table">
                <tr>
                    <td style="width: 25%;">
                        <div class="metric-label">OEE Total</div>
                        <div class="metric-value oee-value">${oeeTotal}</div>
                    </td>
                    <td style="width: 25%;">
                        <div class="metric-label">Disponibilidade</div>
                        <div class="metric-value availability-value">${availability}</div>
                    </td>
                    <td style="width: 25%;">
                        <div class="metric-label">Performance</div>
                        <div class="metric-value performance-value">${performance}</div>
                    </td>
                    <td style="width: 25%;">
                        <div class="metric-label">Qualidade</div>
                        <div class="metric-value quality-value">${quality}</div>
                    </td>
                </tr>
            </table>
        </div>
    `;
    
    // Encontrar todos os containers de gráficos
    const chartContainers = [
        'oee-chart', 'availability-chart', 'performance-chart', 
        'oee-trend-chart', 'stops-chart', 'machine-oee-chart',
        'production-chart-container', 'stops-analysis-chart', 'scrap-analysis-chart'
    ];
    
    // Para cada gráfico, adicionar uma seção no relatório
    chartContainers.forEach((containerId, index) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const canvas = container.querySelector('canvas');
        if (!canvas) return;
        
        // Obter título do gráfico baseado no ID
        let chartTitle = "Gráfico " + (index + 1);
        if (containerId === 'oee-chart') chartTitle = "Evolução do OEE";
        if (containerId === 'availability-chart') chartTitle = "Evolução da Disponibilidade";
        if (containerId === 'performance-chart') chartTitle = "Evolução da Performance";
        if (containerId === 'oee-trend-chart') chartTitle = "Tendência de OEE";
        if (containerId === 'stops-chart') chartTitle = "Distribuição de Paradas";
        if (containerId === 'machine-oee-chart') chartTitle = "OEE por Máquina";
        if (containerId === 'production-chart-container') chartTitle = "Análise de Produção";
        if (containerId === 'stops-analysis-chart') chartTitle = "Análise de Paradas";
        if (containerId === 'scrap-analysis-chart') chartTitle = "Análise de Descartes";
        
        // Adicionar seção para este gráfico
        reportContent += `
            <div class="chart-container">
                <div class="chart-title">${chartTitle}</div>
                <img src="${canvas.toDataURL('image/png')}" alt="${chartTitle}">
            </div>
        `;
    });
    
    // Adicionar informações de máquinas
    reportContent += `
        <h2>Status das Máquinas</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Máquina</th>
                    <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">Status</th>
                    <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">OEE</th>
                    <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">Disponibilidade</th>
                    <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">Performance</th>
                    <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">Qualidade</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Obter dados das máquinas
    const machineCards = document.querySelectorAll('.machine-card');
    machineCards.forEach(card => {
        const machineName = card.querySelector('h3')?.textContent || 'N/A';
        const statusEl = card.querySelector('.machine-status');
        const status = statusEl?.textContent || 'N/A';
        const statusClass = statusEl?.className.includes('running') ? 'color: #0f9d58;' : 
                           statusEl?.className.includes('idle') ? 'color: #f4b400;' : 
                           statusEl?.className.includes('stopped') ? 'color: #d93025;' : '';
        
        const oeeEl = card.querySelector('.metric:nth-child(1) .metric-value');
        const availabilityEl = card.querySelector('.metric:nth-child(2) .metric-value');
        const performanceEl = card.querySelector('.metric:nth-child(3) .metric-value');
        const qualityEl = card.querySelector('.metric:nth-child(4) .metric-value');
        
        reportContent += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; text-align: left;">${machineName}</td>
                <td style="padding: 10px; text-align: center; font-weight: bold; ${statusClass}">${status}</td>
                <td style="padding: 10px; text-align: center;">${oeeEl?.textContent || 'N/A'}</td>
                <td style="padding: 10px; text-align: center;">${availabilityEl?.textContent || 'N/A'}</td>
                <td style="padding: 10px; text-align: center;">${performanceEl?.textContent || 'N/A'}</td>
                <td style="padding: 10px; text-align: center;">${qualityEl?.textContent || 'N/A'}</td>
            </tr>
        `;
    });
    
    // Fechar a tabela e o HTML
    reportContent += `
            </tbody>
        </table>
        <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
            Relatório gerado pelo Sistema OEE - ${formattedDate}
        </div>
        </body>
        </html>
    `;
    
    // Se a biblioteca html2pdf estiver disponível, usar para gerar PDF
    if (typeof html2pdf !== 'undefined') {
        // Criar um elemento para renderizar o conteúdo
        const element = document.createElement('div');
        element.innerHTML = reportContent;
        element.style.display = 'none';
        document.body.appendChild(element);
        
        // Configurar opções do PDF
        const opt = {
            margin: [10, 10],
            filename: `relatorio-oee-${getFormattedDate()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        // Gerar PDF
        html2pdf().set(opt).from(element).save().then(() => {
            document.body.removeChild(element);
            showExportNotification(`Relatório PDF gerado com sucesso`);
        });
    } else {
        // Fallback para HTML se html2pdf não estiver disponível
        const blob = new Blob([reportContent], {type: 'text/html'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio-oee-${getFormattedDate()}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showExportNotification(`Relatório HTML gerado com sucesso`);
    }
}

// Função para adicionar botões de exportação a cada gráfico
function addExportButtonsToCharts() {
    // Encontrar todos os containers de gráficos
    const chartContainers = [
        'oee-chart', 'availability-chart', 'performance-chart', 
        'oee-trend-chart', 'stops-chart', 'machine-oee-chart',
        'production-chart-container', 'stops-analysis-chart', 'scrap-analysis-chart'
    ];
    
    chartContainers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Verificar se o container já tem botões de exportação
        if (container.querySelector('.export-buttons')) return;
        
        // Criar um wrapper para os botões
        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'export-buttons';
        buttonWrapper.style.display = 'flex';
        buttonWrapper.style.justifyContent = 'flex-end';
        buttonWrapper.style.gap = '8px';
        buttonWrapper.style.marginTop = '8px';
        
        // Botão de exportar PNG
        const pngButton = document.createElement('button');
        pngButton.innerHTML = '<i class="fas fa-file-image"></i> PNG';
        pngButton.className = 'export-btn export-png';
        pngButton.setAttribute('data-chart', containerId);
        pngButton.addEventListener('click', function() {
            exportChartAsPNG(containerId);
        });
        
        // Botão de exportar CSV
        const csvButton = document.createElement('button');
        csvButton.innerHTML = '<i class="fas fa-file-csv"></i> CSV';
        csvButton.className = 'export-btn export-csv';
        csvButton.setAttribute('data-chart', containerId);
        csvButton.addEventListener('click', function() {
            exportChartAsCSV(containerId);
        });
        
        // Adicionar botões ao wrapper
        buttonWrapper.appendChild(pngButton);
        buttonWrapper.appendChild(csvButton);
        
        // Adicionar wrapper ao container
        container.appendChild(buttonWrapper);
    });
}

// Inicializar componentes de exportação
function initExportFeatures() {
    // Adicionar estilos para botões de exportação
    const style = document.createElement('style');
    style.textContent = `
        .export-btn {
            padding: 5px 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8rem;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: background-color 0.2s;
        }
        .export-png {
            background-color: #1a73e8;
            color: white;
        }
        .export-csv {
            background-color: #0f9d58;
            color: white;
        }
        .export-btn:hover {
            opacity: 0.9;
        }
        .export-btn i {
            font-size: 0.9rem;
        }
        .export-buttons {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 8px;
        }
    `;
    document.head.appendChild(style);
    
    // Adicionar botões a todos os gráficos
    addExportButtonsToCharts();

    // Adicionar botão de exportação global
    addGlobalExportButton();
    
    logMessage('Recursos de exportação de gráficos inicializados com sucesso');
}

// Carregar recursos necessários e inicializar exportação
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se a biblioteca JSZip está carregada
    if (typeof JSZip === 'undefined') {
        // Carregar JSZip dinamicamente
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = function() {
            console.log('JSZip carregado com sucesso');
            
            // Verificar html2pdf
            if (typeof html2pdf === 'undefined') {
                const pdfScript = document.createElement('script');
                pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                pdfScript.onload = function() {
                    console.log('html2pdf carregado com sucesso');
                    // Inicializar após pequeno atraso para garantir que os gráficos estejam prontos
                    setTimeout(initExportFeatures, 1000);
                };
                document.head.appendChild(pdfScript);
            } else {
                setTimeout(initExportFeatures, 1000);
            }
        };
        document.head.appendChild(script);
    } else {
        // Verificar html2pdf
        if (typeof html2pdf === 'undefined') {
            const pdfScript = document.createElement('script');
            pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            pdfScript.onload = function() {
                console.log('html2pdf carregado com sucesso');
                setTimeout(initExportFeatures, 1000);
            };
            document.head.appendChild(pdfScript);
        } else {
            setTimeout(initExportFeatures, 1000);
        }
    }
});