// Data storage
var movements = JSON.parse(localStorage.getItem('movements')) || [];
var silos = JSON.parse(localStorage.getItem('silos')) || {
    '1A': { start: 0, current: 0, history: [] },
    '1B': { start: 0, current: 0, history: [] },
    '2': { start: 0, current: 0, history: [] },
    '3': { start: 0, current: 0, history: [] }
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    renderMovements();
    renderSilos();
    renderSiloData();
    renderSummaryStats();
    setTodayDates();
});

function setTodayDates() {
    var today = new Date().toISOString().split('T')[0];
    document.getElementById('move-date').value = today;
    document.getElementById('date-1A').value = today;
    document.getElementById('date-1B').value = today;
    document.getElementById('date-2').value = today;
    document.getElementById('date-3').value = today;
}

function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(function(tab) {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

function showAddForm() {
    document.getElementById('addForm').style.display = 'block';
}

function closeForm() {
    document.getElementById('addForm').style.display = 'none';
}

function addMovement(event) {
    event.preventDefault();
    
    var bagNumbers = document.getElementById('bag-numbers').value.split(',').map(function(bag) {
        return bag.trim();
    }).filter(function(bag) {
        return bag !== '';
    });
    
    var movement = {
        id: Date.now(),
        date: document.getElementById('move-date').value,
        feedType: document.getElementById('feed-type').value,
        from: document.getElementById('from').value,
        to: document.getElementById('to').value,
        bagNumbers: bagNumbers,
        batchNumber: document.getElementById('batch-number').value || '',
        amount: bagNumbers.length * 1000
    };
    
    if (movement.from === movement.to) {
        alert('Source and destination cannot be the same!');
        return;
    }
    
    movements.push(movement);
    
    // Update silo amounts
    if (movement.to.startsWith('Silo')) {
        var silo = movement.to.replace('Silo ', '');
        silos[silo].current += movement.amount;
        silos[silo].history.push({
            date: movement.date,
            type: 'Added',
            amount: movement.amount,
            feedType: movement.feedType,
            bags: movement.bagNumbers.join(', '),
            batchNumber: movement.batchNumber
        });
    }
    
    if (movement.from.startsWith('Silo')) {
        var silo = movement.from.replace('Silo ', '');
        silos[silo].current -= movement.amount;
        silos[silo].history.push({
            date: movement.date,
            type: 'Removed',
            amount: -movement.amount,
            feedType: movement.feedType,
            bags: movement.bagNumbers.join(', ')
        });
    }
    
    saveData();
    renderMovements();
    renderSilos();
    renderSiloData();
    renderSummaryStats();
    closeForm();
    event.target.reset();
}

function updateStart(silo, amount) {
    silos[silo].start = parseFloat(amount) || 0;
    silos[silo].current = silos[silo].start + getTotalAdded(silo) - getTotalFedOut(silo);
    saveData();
    renderSilos();
}

function feedOut(silo) {
    var date = document.getElementById('date-' + silo).value;
    var amount = parseFloat(document.getElementById('amount-' + silo).value);
    
    if (!date || !amount || amount <= 0) {
        alert('Please enter valid date and amount');
        return;
    }
    
    if (silos[silo].current < amount) {
        alert('Not enough feed in silo! Current: ' + silos[silo].current + 'kg');
        return;
    }
    
    silos[silo].current -= amount;
    silos[silo].history.push({
        date: date,
        type: 'Fed Out',
        amount: -amount,
        feedType: 'Daily Feed'
    });
    
    // Add to movements register
    movements.push({
        id: Date.now(),
        date: date,
        feedType: 'Daily Feed Out',
        from: 'Silo ' + silo,
        to: 'Fed Out',
        bagNumbers: ['N/A'],
        amount: amount
    });
    
    document.getElementById('amount-' + silo).value = '';
    saveData();
    renderMovements();
    renderSilos();
    renderSummaryStats();
    alert('Fed out ' + amount + 'kg from Silo ' + silo);
}

function getTotalAdded(silo) {
    return silos[silo].history
        .filter(function(item) { return item.amount > 0; })
        .reduce(function(sum, item) { return sum + item.amount; }, 0);
}

function getTotalFedOut(silo) {
    return Math.abs(silos[silo].history
        .filter(function(item) { return item.amount < 0; })
        .reduce(function(sum, item) { return sum + item.amount; }, 0));
}

function renderMovements() {
    var tbody = document.querySelector('#movements-table tbody');
    tbody.innerHTML = '';
    
    movements.forEach(function(movement) {
        var row = tbody.insertRow();
        row.innerHTML = 
            '<td>' + new Date(movement.date).toLocaleDateString() + '</td>' +
            '<td>' + movement.feedType + '</td>' +
            '<td>' + movement.from + '</td>' +
            '<td>' + movement.to + '</td>' +
            '<td>' + movement.bagNumbers.join(', ') + ' (' + movement.bagNumbers.length + ' bags)</td>' +
            '<td><button onclick="deleteMovement(' + movement.id + ')">Delete</button></td>';
    });
}

function renderSilos() {
    Object.keys(silos).forEach(function(silo) {
        document.getElementById('start-' + silo).value = silos[silo].start;
        document.getElementById('current-' + silo).textContent = silos[silo].current.toFixed(1);
        
        var historyDiv = document.getElementById('history-' + silo);
        historyDiv.innerHTML = '';
        
        silos[silo].history.slice(-5).reverse().forEach(function(item) {
            var div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = 
                '<strong>' + new Date(item.date).toLocaleDateString() + '</strong><br>' +
                item.type + ': ' + (item.amount > 0 ? '+' : '') + item.amount + 'kg<br>' +
                (item.bags ? 'Bags: ' + item.bags : '');
            historyDiv.appendChild(div);
        });
    });
}

function renderSiloData() {
    Object.keys(silos).forEach(function(silo) {
        var tbody = document.querySelector('#data-table-' + silo + ' tbody');
        tbody.innerHTML = '';
        
        // Get all additions to this silo
        var additions = silos[silo].history.filter(function(item) {
            return item.type === 'Added';
        });
        
        additions.forEach(function(item) {
            var row = tbody.insertRow();
            row.innerHTML = 
                '<td>' + new Date(item.date).toLocaleDateString() + '</td>' +
                '<td>' + item.feedType + '</td>' +
                '<td>' + item.bags + '</td>' +
                '<td>' + (item.batchNumber || '-') + '</td>' +
                '<td>' + item.amount.toLocaleString() + '</td>';
        });
        
        if (additions.length === 0) {
            var row = tbody.insertRow();
            row.innerHTML = '<td colspan="5" style="text-align: center; color: #999;">No inventory data</td>';
        }
    });
}

function renderSummaryStats() {
    var totalMovements = movements.length;
    var totalLoaded = 0;
    var totalFedOut = 0;
    var currentStock = 0;
    
    // Calculate totals from movements
    movements.forEach(function(movement) {
        if (movement.to.startsWith('Silo') || movement.to === 'Hold') {
            totalLoaded += movement.amount;
        }
        if (movement.to === 'Fed Out') {
            totalFedOut += movement.amount;
        }
    });
    
    // Calculate current stock from silos
    Object.keys(silos).forEach(function(silo) {
        currentStock += silos[silo].current;
    });
    
    document.getElementById('total-movements').textContent = totalMovements;
    document.getElementById('total-loaded').textContent = totalLoaded.toLocaleString() + ' kg';
    document.getElementById('total-fed-out').textContent = totalFedOut.toLocaleString() + ' kg';
    document.getElementById('current-stock').textContent = currentStock.toLocaleString() + ' kg';
}

function deleteAllData() {
    if (confirm('Are you sure you want to delete ALL data? This action cannot be undone!')) {
        if (confirm('This will permanently delete all movements, silo data, and history. Are you absolutely sure?')) {
            // Clear all data
            movements = [];
            silos = {
                '1A': { start: 0, current: 0, history: [] },
                '1B': { start: 0, current: 0, history: [] },
                '2': { start: 0, current: 0, history: [] },
                '3': { start: 0, current: 0, history: [] }
            };
            
            // Clear localStorage
            localStorage.removeItem('movements');
            localStorage.removeItem('silos');
            
            // Re-render everything
            renderMovements();
            renderSilos();
            renderSiloData();
            renderSummaryStats();
            
            alert('All data has been deleted successfully.');
        }
    }
}

function exportToWord() {
    var reportDate = new Date().toLocaleDateString();
    var reportTime = new Date().toLocaleTimeString();
    
    // Calculate summary data
    var totalLoaded = 0;
    var totalFedOut = 0;
    var currentStock = 0;
    
    movements.forEach(function(movement) {
        if (movement.to.startsWith('Silo') || movement.to === 'Hold') {
            totalLoaded += movement.amount;
        }
        if (movement.to === 'Fed Out') {
            totalFedOut += movement.amount;
        }
    });
    
    Object.keys(silos).forEach(function(silo) {
        currentStock += silos[silo].current;
    });
    
    // Create HTML content for Word document
    var htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>K5 Barge Feed Movement Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .summary { background: #f0f0f0; padding: 20px; margin-bottom: 30px; }
                .section { margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .silo-section { page-break-inside: avoid; margin-bottom: 40px; }
                .no-data { text-align: center; color: #666; font-style: italic; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>K5 Barge Feed Movement Report</h1>
                <p>Generated on: ${reportDate} at ${reportTime}</p>
            </div>
            
            <div class="summary">
                <h2>Summary Statistics</h2>
                <p><strong>Total Feed Loaded:</strong> ${totalLoaded.toLocaleString()} kg</p>
                <p><strong>Total Feed Fed Out:</strong> ${totalFedOut.toLocaleString()} kg</p>
                <p><strong>Current Stock:</strong> ${currentStock.toLocaleString()} kg</p>
                <p><strong>Total Movements:</strong> ${movements.length}</p>
            </div>
            
            <div class="section">
                <h2>Feed Movement Register</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Feed Type</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Bag Numbers</th>
                            <th>Batch Number</th>
                            <th>Amount (kg)</th>
                        </tr>
                    </thead>
                    <tbody>`;
    
    if (movements.length === 0) {
        htmlContent += '<tr><td colspan="7" class="no-data">No movements recorded</td></tr>';
    } else {
        // Filter out daily feed out movements for the report
        var reportMovements = movements.filter(function(movement) {
            return movement.to !== 'Fed Out';
        });
        
        reportMovements.forEach(function(movement) {
            htmlContent += `
                <tr>
                    <td>${new Date(movement.date).toLocaleDateString()}</td>
                    <td>${movement.feedType}</td>
                    <td>${movement.from}</td>
                    <td>${movement.to}</td>
                    <td>${movement.bagNumbers.join(', ')}</td>
                    <td>${movement.batchNumber || '-'}</td>
                    <td>${movement.amount.toLocaleString()}</td>
                </tr>`;
        });
        
        if (reportMovements.length === 0) {
            htmlContent += '<tr><td colspan="7" class="no-data">No loading movements recorded</td></tr>';
        }
    }
    
    htmlContent += `
                    </tbody>
                </table>
            </div>`;
    
    // Add silo data sections with total feed out
    Object.keys(silos).forEach(function(silo) {
        var additions = silos[silo].history.filter(function(item) {
            return item.type === 'Added';
        });
        
        var totalSiloFedOut = getTotalFedOut(silo);
        
        htmlContent += `
            <div class="silo-section">
                <h2>Silo ${silo} Inventory</h2>
                <p><strong>Starting Amount:</strong> ${silos[silo].start.toLocaleString()} kg</p>
                <p><strong>Current Amount:</strong> ${silos[silo].current.toLocaleString()} kg</p>
                <p><strong>Total Fed Out:</strong> ${totalSiloFedOut.toLocaleString()} kg</p>
                <table>
                    <thead>
                        <tr>
                            <th>Date Added</th>
                            <th>Feed Type</th>
                            <th>Bag Numbers</th>
                            <th>Batch Number</th>
                            <th>Amount (kg)</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        if (additions.length === 0) {
            htmlContent += '<tr><td colspan="5" class="no-data">No inventory data</td></tr>';
        } else {
            additions.forEach(function(item) {
                htmlContent += `
                    <tr>
                        <td>${new Date(item.date).toLocaleDateString()}</td>
                        <td>${item.feedType}</td>
                        <td>${item.bags}</td>
                        <td>${item.batchNumber || '-'}</td>
                        <td>${item.amount.toLocaleString()}</td>
                    </tr>`;
            });
        }
        
        htmlContent += `
                    </tbody>
                </table>
            </div>`;
    });
    
    htmlContent += `
        </body>
        </html>`;
    
    // Create and download the file
    var blob = new Blob([htmlContent], { type: 'application/msword' });
    var url = window.URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'K5_Barge_Feed_Report_' + new Date().toISOString().slice(0, 10) + '.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    alert('Report has been exported successfully!');
}

function deleteMovement(id) {
    if (confirm('Delete this movement?')) {
        movements = movements.filter(function(m) { return m.id !== id; });
        saveData();
        renderMovements();
    }
}

function loadData() {
    Object.keys(silos).forEach(function(silo) {
        silos[silo].current = silos[silo].start + getTotalAdded(silo) - getTotalFedOut(silo);
    });
}

function saveData() {
    localStorage.setItem('movements', JSON.stringify(movements));
    localStorage.setItem('silos', JSON.stringify(silos));
}

// Close modal when clicking outside
window.onclick = function(event) {
    var modal = document.getElementById('addForm');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}
