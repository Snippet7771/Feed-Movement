// Data storage
var currentBoat = '';
var movements = {};
var hoppers = {};

// Boat configurations
var boatConfigs = {
    lotus: {
        name: 'Lotus',
        hopperCount: 2,
        hopperCapacity: 2000, // 2t = 2000kg
        hoppers: ['1', '2']
    },
    lotus2: {
        name: 'Lotus 2',
        hopperCount: 2,
        hopperCapacity: 2000,
        hoppers: ['1', '2']
    },
    annas: {
        name: 'Anna S',
        hopperCount: 3,
        hopperCapacity: 3000, // 3t = 3000kg
        hoppers: ['1', '2', '3']
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadAllData();
    setTodayDates();
});

function setTodayDates() {
    var today = new Date().toISOString().split('T')[0];
    var moveDate = document.getElementById('move-date');
    if (moveDate) {
        moveDate.value = today;
    }
}

function changeBoat() {
    var selector = document.getElementById('boat-selector');
    currentBoat = selector.value;
    
    if (currentBoat) {
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('boat-selection-message').style.display = 'none';
        
        initializeBoatData();
        setupFormOptions();
        renderAll();
    } else {
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('boat-selection-message').style.display = 'block';
    }
}

function initializeBoatData() {
    if (!movements[currentBoat]) {
        movements[currentBoat] = [];
    }
    
    if (!hoppers[currentBoat]) {
        hoppers[currentBoat] = {};
        var config = boatConfigs[currentBoat];
        config.hoppers.forEach(function(hopper) {
            hoppers[currentBoat][hopper] = {
                start: 0,
                current: 0,
                history: [],
                feedType: ''
            };
        });
    }
}

function setupFormOptions() {
    var fromSelect = document.getElementById('from');
    var toSelect = document.getElementById('to');
    var config = boatConfigs[currentBoat];
    
    // Clear existing hopper options
    var existingOptions = fromSelect.querySelectorAll('.hopper-option');
    existingOptions.forEach(function(option) {
        option.remove();
    });
    existingOptions = toSelect.querySelectorAll('.hopper-option');
    existingOptions.forEach(function(option) {
        option.remove();
    });
    
    // Update FROM select for blow boats
    var externalOption = fromSelect.querySelector('option[value="External"]');
    if (externalOption) {
        externalOption.value = 'Truck';
        externalOption.textContent = 'Truck';
    }
    
    var holdOption = fromSelect.querySelector('option[value="Hold"]');
    if (holdOption) {
        holdOption.value = 'Leroy Barge';
        holdOption.textContent = 'Leroy Barge';
    }
    
    // Add Leroy Barge to TO select
    var leroyToOption = toSelect.querySelector('option[value="Hold"]');
    if (leroyToOption) {
        leroyToOption.value = 'Leroy Barge';
        leroyToOption.textContent = 'Leroy Barge';
    } else {
        var newLeroyOption = document.createElement('option');
        newLeroyOption.value = 'Leroy Barge';
        newLeroyOption.textContent = 'Leroy Barge';
        toSelect.appendChild(newLeroyOption);
    }
    
    // Add hopper options to TO select
    config.hoppers.forEach(function(hopper) {
        var toOption = document.createElement('option');
        toOption.value = 'Hopper ' + hopper;
        toOption.textContent = 'Hopper ' + hopper;
        toOption.className = 'hopper-option';
        toSelect.appendChild(toOption);
    });
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(function(tab) {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });
    
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
    
    // Validate Leroy Barge removal
    if (movement.from === 'Leroy Barge' && !validateLeroyRemoval(bagNumbers)) {
        return;
    }
    
    movements[currentBoat].push(movement);
    
    // Update hopper amounts
    if (movement.to.startsWith('Hopper')) {
        var hopper = movement.to.replace('Hopper ', '');
        hoppers[currentBoat][hopper].current += movement.amount;
        hoppers[currentBoat][hopper].history.push({
            date: movement.date,
            type: 'Added',
            amount: movement.amount,
            feedType: movement.feedType,
            bags: movement.bagNumbers.join(', '),
            batchNumber: movement.batchNumber
        });
    }
    
    if (movement.from.startsWith('Hopper')) {
        var hopper = movement.from.replace('Hopper ', '');
        hoppers[currentBoat][hopper].current -= movement.amount;
        hoppers[currentBoat][hopper].history.push({
            date: movement.date,
            type: 'Removed',
            amount: -movement.amount,
            feedType: movement.feedType,
            bags: movement.bagNumbers.join(', '),
            batchNumber: movement.batchNumber
        });
    }
    
    saveAllData();
    renderAll();
    closeForm();
    event.target.reset();
}

function updateStart(hopper, amount) {
    hoppers[currentBoat][hopper].start = parseFloat(amount) || 0;
    hoppers[currentBoat][hopper].current = hoppers[currentBoat][hopper].start + getTotalAdded(hopper) - getTotalFedOut(hopper);
    saveAllData();
    renderHoppers();
}

function updateFeedType(hopper, feedType) {
    hoppers[currentBoat][hopper].feedType = feedType;
    saveAllData();
}

function feedOut(hopper) {
    var date = document.getElementById('date-' + hopper).value;
    var amount = parseFloat(document.getElementById('amount-' + hopper).value);
    
    if (!date || !amount || amount <= 0) {
        alert('Please enter valid date and amount');
        return;
    }
    
    if (hoppers[currentBoat][hopper].current < amount) {
        alert('Not enough feed in hopper! Current: ' + hoppers[currentBoat][hopper].current + 'kg');
        return;
    }
    
    hoppers[currentBoat][hopper].current -= amount;
    hoppers[currentBoat][hopper].history.push({
        date: date,
        type: 'Fed Out',
        amount: -amount,
        feedType: 'Daily Feed'
    });
    
    // Add to movements register
    movements[currentBoat].push({
        id: Date.now(),
        date: date,
        feedType: 'Daily Feed Out',
        from: 'Hopper ' + hopper,
        to: 'Fed Out',
        bagNumbers: ['N/A'],
        amount: amount
    });
    
    document.getElementById('amount-' + hopper).value = '';
    saveAllData();
    renderAll();
    alert('Fed out ' + amount + 'kg from Hopper ' + hopper);
}

function getTotalAdded(hopper) {
    return hoppers[currentBoat][hopper].history
        .filter(function(item) { return item.amount > 0; })
        .reduce(function(sum, item) { return sum + item.amount; }, 0);
}

function getTotalFedOut(hopper) {
    return Math.abs(hoppers[currentBoat][hopper].history
        .filter(function(item) { return item.amount < 0; })
        .reduce(function(sum, item) { return sum + item.amount; }, 0));
}

function renderAll() {
    if (!currentBoat) return;
    
    renderMovements();
    renderHoppers();
    renderLeroyBarge();
    renderHopperData();
    renderSummaryStats();
    
    // Set today's date for feed out inputs
    var today = new Date().toISOString().split('T')[0];
    var config = boatConfigs[currentBoat];
    config.hoppers.forEach(function(hopper) {
        var dateInput = document.getElementById('date-' + hopper);
        if (dateInput) {
            dateInput.value = today;
        }
    });
}

function renderMovements() {
    var tbody = document.querySelector('#movements-table tbody');
    tbody.innerHTML = '';
    
    movements[currentBoat].forEach(function(movement) {
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

function renderHoppers() {
    var config = boatConfigs[currentBoat];
    var grid = document.getElementById('hoppers-grid');
    grid.innerHTML = '';
    
    config.hoppers.forEach(function(hopper) {
        var hopperData = hoppers[currentBoat][hopper];
        var div = document.createElement('div');
        div.className = 'hopper-card';
        div.innerHTML = `
            <h3>Hopper ${hopper}</h3>
            <div class="hopper-info">
                <p>Capacity: ${config.hopperCapacity.toLocaleString()} kg (${config.hopperCapacity/1000}t)</p>
                <p>Feed Type: <input type="text" id="feedtype-${hopper}" onchange="updateFeedType('${hopper}', this.value)" value="${hopperData.feedType}" placeholder="Enter feed type"></p>
                <p>Starting Amount: <input type="number" id="start-${hopper}" onchange="updateStart('${hopper}', this.value)" value="${hopperData.start}"> kg</p>
                <p>Current Amount: <span id="current-${hopper}">${hopperData.current.toFixed(1)}</span> kg</p>
            </div>
            <div class="feed-out">
                <input type="date" id="date-${hopper}">
                <input type="number" id="amount-${hopper}" placeholder="Amount (kg)">
                <button onclick="feedOut('${hopper}')">Feed Out</button>
            </div>
            <div class="history" id="history-${hopper}"></div>
        `;
        grid.appendChild(div);
        
        // Render history
        var historyDiv = document.getElementById('history-' + hopper);
        hopperData.history.slice(-5).reverse().forEach(function(item) {
            var historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = 
                '<strong>' + new Date(item.date).toLocaleDateString() + '</strong><br>' +
                item.type + ': ' + (item.amount > 0 ? '+' : '') + item.amount + 'kg<br>' +
                (item.bags ? 'Bags: ' + item.bags : '');
            historyDiv.appendChild(historyItem);
        });
    });
}

function renderLeroyBarge() {
    var leroyData = calculateLeroyInventory();
    
    // Render Leroy Barge inventory summary
    var leroyInventory = document.getElementById('leroy-inventory');
    leroyInventory.innerHTML = '';
    
    if (Object.keys(leroyData.summary).length === 0) {
        leroyInventory.innerHTML = '<div class="leroy-inventory-item"><span>No items on Leroy Barge</span><span>0 kg</span></div>';
    } else {
        Object.keys(leroyData.summary).forEach(function(feedType) {
            var div = document.createElement('div');
            div.className = 'leroy-inventory-item';
            div.innerHTML = 
                '<span>' + feedType + '</span>' +
                '<span>' + leroyData.summary[feedType].toLocaleString() + ' kg</span>';
            leroyInventory.appendChild(div);
        });
    }

    // Render Leroy Barge table with movement history
    var tbody = document.querySelector('#leroy-table tbody');
    tbody.innerHTML = '';

    // Show all Leroy Barge-related movements
    var leroyMovements = movements[currentBoat].filter(function(m) {
        return m.to === 'Leroy Barge' || m.from === 'Leroy Barge';
    });
    
    leroyMovements.forEach(function(movement) {
        var row = tbody.insertRow();
        var bagDisplay = movement.bagNumbers.length > 0 ? movement.bagNumbers.join(', ') : movement.bagNumber;
        var movementType = movement.to === 'Leroy Barge' ? 'Loaded onto Barge' : 'Unloaded to ' + movement.to;
        
        row.innerHTML = 
            '<td>' + new Date(movement.date).toLocaleDateString() + '</td>' +
            '<td>' + movement.feedType + '</td>' +
            '<td>' + bagDisplay + '</td>' +
            '<td>' + (movement.batchNumber || '-') + '</td>' +
            '<td>' + movement.amount.toLocaleString() + '</td>' +
            '<td>' + movementType + '</td>';
    });
}

function showAddForm() {
    document.getElementById('addForm').style.display = 'block';
}

function closeForm() {
    document.getElementById('addForm').style.display = 'none';
}

function calculateLeroyInventory() {
    var leroyData = { bags: {}, summary: {} };

    movements[currentBoat].forEach(function(movement) {
        if (movement.from === 'Truck' && movement.to === 'Leroy Barge') {
            // Loading onto Leroy Barge from truck
            movement.bagNumbers.forEach(function(bagNumber) {
                if (!leroyData.bags[bagNumber]) {
                    leroyData.bags[bagNumber] = {
                        bagNumber: bagNumber,
                        feedType: movement.feedType,
                        batchNumber: movement.batchNumber,
                        dateAdded: movement.date,
                        total: 0,
                        used: 0,
                        available: 0
                    };
                }
                leroyData.bags[bagNumber].total += 1000;
            });
        } else if (movement.from === 'Leroy Barge') {
            // Removing from Leroy Barge to hoppers
            movement.bagNumbers.forEach(function(bagNumber) {
                if (leroyData.bags[bagNumber]) {
                    leroyData.bags[bagNumber].used += 1000;
                }
            });
        }
    });

    Object.values(leroyData.bags).forEach(function(bag) {
        bag.available = bag.total - bag.used;
        if (bag.available > 0) {
            if (!leroyData.summary[bag.feedType]) {
                leroyData.summary[bag.feedType] = 0;
            }
            leroyData.summary[bag.feedType] += bag.available;
        }
    });

    leroyData.bags = Object.values(leroyData.bags);
    return leroyData;
}

function validateLeroyRemoval(bagNumbers) {
    var leroyInventory = calculateLeroyInventory();
    
    for (var i = 0; i < bagNumbers.length; i++) {
        var bagNumber = bagNumbers[i];
        var availableBag = leroyInventory.bags.find(function(bag) {
            return bag.bagNumber === bagNumber && bag.available > 0;
        });
        if (!availableBag) {
            alert('Bag ' + bagNumber + ' is not available on Leroy Barge!');
            return false;
        }
    }
    return true;
}

function updateStart(hopper, amount) {
    hoppers[currentBoat][hopper].start = parseFloat(amount) || 0;
    hoppers[currentBoat][hopper].current = hoppers[currentBoat][hopper].start + getTotalAdded(hopper) - getTotalFedOut(hopper);
    saveAllData();
    renderHoppers();
}

function updateFeedType(hopper, feedType) {
    hoppers[currentBoat][hopper].feedType = feedType;
    saveAllData();
}

function feedOut(hopper) {
    var date = document.getElementById('date-' + hopper).value;
    var amount = parseFloat(document.getElementById('amount-' + hopper).value);
    
    if (!date || !amount || amount <= 0) {
        alert('Please enter valid date and amount');
        return;
    }
    
    if (hoppers[currentBoat][hopper].current < amount) {
        alert('Not enough feed in hopper! Current: ' + hoppers[currentBoat][hopper].current + 'kg');
        return;
    }
    
    hoppers[currentBoat][hopper].current -= amount;
    hoppers[currentBoat][hopper].history.push({
        date: date,
        type: 'Fed Out',
        amount: -amount,
        feedType: 'Daily Feed'
    });
    
    // Add to movements register
    movements[currentBoat].push({
        id: Date.now(),
        date: date,
        feedType: 'Daily Feed Out',
        from: 'Hopper ' + hopper,
        to: 'Fed Out',
        bagNumbers: ['N/A'],
        amount: amount
    });
    
    document.getElementById('amount-' + hopper).value = '';
    saveAllData();
    renderAll();
    alert('Fed out ' + amount + 'kg from Hopper ' + hopper);
}

function getTotalAdded(hopper) {
    return hoppers[currentBoat][hopper].history
        .filter(function(item) { return item.amount > 0; })
        .reduce(function(sum, item) { return sum + item.amount; }, 0);
}

function getTotalFedOut(hopper) {
    return Math.abs(hoppers[currentBoat][hopper].history
        .filter(function(item) { return item.amount < 0; })
        .reduce(function(sum, item) { return sum + item.amount; }, 0));
}

function renderAll() {
    if (!currentBoat) return;
    
    renderMovements();
    renderHoppers();
    renderLeroyBarge();
    renderHopperData();
    renderSummaryStats();
    
    // Set today's date for feed out inputs
    var today = new Date().toISOString().split('T')[0];
    var config = boatConfigs[currentBoat];
    config.hoppers.forEach(function(hopper) {
        var dateInput = document.getElementById('date-' + hopper);
        if (dateInput) {
            dateInput.value = today;
        }
    });
}

function renderMovements() {
    var tbody = document.querySelector('#movements-table tbody');
    tbody.innerHTML = '';
    
    movements[currentBoat].forEach(function(movement) {
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

function renderHoppers() {
    var config = boatConfigs[currentBoat];
    var grid = document.getElementById('hoppers-grid');
    grid.innerHTML = '';
    
    config.hoppers.forEach(function(hopper) {
        var hopperData = hoppers[currentBoat][hopper];
        var div = document.createElement('div');
        div.className = 'hopper-card';
        div.innerHTML = `
            <h3>Hopper ${hopper}</h3>
            <div class="hopper-info">
                <p>Capacity: ${config.hopperCapacity.toLocaleString()} kg (${config.hopperCapacity/1000}t)</p>
                <p>Feed Type: <input type="text" id="feedtype-${hopper}" onchange="updateFeedType('${hopper}', this.value)" value="${hopperData.feedType}" placeholder="Enter feed type"></p>
                <p>Starting Amount: <input type="number" id="start-${hopper}" onchange="updateStart('${hopper}', this.value)" value="${hopperData.start}"> kg</p>
                <p>Current Amount: <span id="current-${hopper}">${hopperData.current.toFixed(1)}</span> kg</p>
            </div>
            <div class="feed-out">
                <input type="date" id="date-${hopper}">
                <input type="number" id="amount-${hopper}" placeholder="Amount (kg)">
                <button onclick="feedOut('${hopper}')">Feed Out</button>
            </div>
            <div class="history" id="history-${hopper}"></div>
        `;
        grid.appendChild(div);
        
        // Render history
        var historyDiv = document.getElementById('history-' + hopper);
        hopperData.history.slice(-5).reverse().forEach(function(item) {
            var historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = 
                '<strong>' + new Date(item.date).toLocaleDateString() + '</strong><br>' +
                item.type + ': ' + (item.amount > 0 ? '+' : '') + item.amount + 'kg<br>' +
                (item.bags ? 'Bags: ' + item.bags : '');
            historyDiv.appendChild(historyItem);
        });
    });
}

function renderHopperData() {
    var config = boatConfigs[currentBoat];
    var grid = document.getElementById('data-grid');
    grid.innerHTML = '';
    
    config.hoppers.forEach(function(hopper) {
        var hopperData = hoppers[currentBoat][hopper];
        var additions = hopperData.history.filter(function(item) {
            return item.type === 'Added';
        });
        
        var div = document.createElement('div');
        div.className = 'hopper-card';
        div.innerHTML = `
            <h3>Hopper ${hopper} Inventory</h3>
            <p><strong>Current Feed Type:</strong> ${hopperData.feedType || 'Not specified'}</p>
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
                <tbody id="data-table-${hopper}"></tbody>
            </table>
        `;
        grid.appendChild(div);
        
        var tbody = document.getElementById('data-table-' + hopper);
        if (additions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No inventory data</td></tr>';
        } else {
            additions.forEach(function(item) {
                var row = tbody.insertRow();
                row.innerHTML = 
                    '<td>' + new Date(item.date).toLocaleDateString() + '</td>' +
                    '<td>' + item.feedType + '</td>' +
                    '<td>' + item.bags + '</td>' +
                    '<td>' + (item.batchNumber || '-') + '</td>' +
                    '<td>' + item.amount.toLocaleString() + '</td>';
            });
        }
    });
}

function renderSummaryStats() {
    var totalMovements = movements[currentBoat].length;
    var totalLoaded = 0;
    var totalFedOut = 0;
    var currentStock = 0;
    
    movements[currentBoat].forEach(function(movement) {
        if (movement.to.startsWith('Hopper') || movement.to === 'Hold') {
            totalLoaded += movement.amount;
        }
        if (movement.to === 'Fed Out') {
            totalFedOut += movement.amount;
        }
    });
    
    var config = boatConfigs[currentBoat];
    config.hoppers.forEach(function(hopper) {
        currentStock += hoppers[currentBoat][hopper].current;
    });
    
    document.getElementById('total-movements').textContent = totalMovements;
    document.getElementById('total-loaded').textContent = totalLoaded.toLocaleString() + ' kg';
    document.getElementById('total-fed-out').textContent = totalFedOut.toLocaleString() + ' kg';
    document.getElementById('current-stock').textContent = currentStock.toLocaleString() + ' kg';
}

function deleteMovement(id) {
    if (confirm('Delete this movement?')) {
        movements[currentBoat] = movements[currentBoat].filter(function(m) { return m.id !== id; });
        saveAllData();
        renderAll();
    }
}

function deleteAllData() {
    if (confirm('Are you sure you want to delete ALL data for ' + boatConfigs[currentBoat].name + '? This action cannot be undone!')) {
        if (confirm('This will permanently delete all movements and hopper data. Are you absolutely sure?')) {
            movements[currentBoat] = [];
            var config = boatConfigs[currentBoat];
            config.hoppers.forEach(function(hopper) {
                hoppers[currentBoat][hopper] = { start: 0, current: 0, history: [], feedType: '' };
            });
            
            saveAllData();
            renderAll();
            alert('All data has been deleted successfully.');
        }
    }
}

function exportToWord() {
    var config = boatConfigs[currentBoat];
    var reportDate = new Date().toLocaleDateString();
    var reportTime = new Date().toLocaleTimeString();
    
    // Calculate summary data
    var totalLoaded = 0;
    var totalFedOut = 0;
    var currentStock = 0;
    
    movements[currentBoat].forEach(function(movement) {
        if (movement.to.startsWith('Hopper') || movement.to === 'Leroy Barge') {
            totalLoaded += movement.amount;
        }
        if (movement.to === 'Fed Out') {
            totalFedOut += movement.amount;
        }
    });
    
    config.hoppers.forEach(function(hopper) {
        currentStock += hoppers[currentBoat][hopper].current;
    });
    
    var leroyData = calculateLeroyInventory();
    var leroyStock = Object.values(leroyData.summary).reduce(function(sum, amount) {
        return sum + amount;
    }, 0);
    
    // Create HTML content for Word document
    var htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${config.name} Feed Movement Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .summary { background: #f0f0f0; padding: 20px; margin-bottom: 30px; }
                .section { margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .hopper-section { page-break-inside: avoid; margin-bottom: 40px; }
                .no-data { text-align: center; color: #666; font-style: italic; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${config.name} Feed Movement Report</h1>
                <p>Generated on: ${reportDate} at ${reportTime}</p>
            </div>
            
            <div class="summary">
                <h2>Summary Statistics</h2>
                <p><strong>Boat:</strong> ${config.name} (${config.hopperCount} Hoppers - ${config.hopperCapacity/1000}t each)</p>
                <p><strong>Total Feed Loaded:</strong> ${totalLoaded.toLocaleString()} kg</p>
                <p><strong>Total Feed Fed Out:</strong> ${totalFedOut.toLocaleString()} kg</p>
                <p><strong>Current Hopper Stock:</strong> ${currentStock.toLocaleString()} kg</p>
                <p><strong>Current Leroy Barge Stock:</strong> ${leroyStock.toLocaleString()} kg</p>
                <p><strong>Total Movements:</strong> ${movements[currentBoat].length}</p>
            </div>
            
            <div class="section">
                <h2>Leroy Barge Current Inventory</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Feed Type</th>
                            <th>Amount (kg)</th>
                        </tr>
                    </thead>
                    <tbody>`;
    
    if (Object.keys(leroyData.summary).length === 0) {
        htmlContent += '<tr><td colspan="2" class="no-data">No items on Leroy Barge</td></tr>';
    } else {
        Object.keys(leroyData.summary).forEach(function(feedType) {
            htmlContent += `
                <tr>
                    <td>${feedType}</td>
                    <td>${leroyData.summary[feedType].toLocaleString()}</td>
                </tr>`;
        });
    }
    
    htmlContent += `
                    </tbody>
                </table>
            </div>`;
    
    // Add hopper data sections
    config.hoppers.forEach(function(hopper) {
        var hopperData = hoppers[currentBoat][hopper];
        var additions = hopperData.history.filter(function(item) {
            return item.type === 'Added';
        });
        
        var totalHopperFedOut = getTotalFedOut(hopper);
        
        htmlContent += `
            <div class="hopper-section">
                <h2>Hopper ${hopper} Inventory</h2>
                <p><strong>Capacity:</strong> ${config.hopperCapacity.toLocaleString()} kg (${config.hopperCapacity/1000}t)</p>
                <p><strong>Current Feed Type:</strong> ${hopperData.feedType || 'Not specified'}</p>
                <p><strong>Starting Amount:</strong> ${hopperData.start.toLocaleString()} kg</p>
                <p><strong>Current Amount:</strong> ${hopperData.current.toLocaleString()} kg</p>
                <p><strong>Total Fed Out:</strong> ${totalHopperFedOut.toLocaleString()} kg</p>
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
    link.download = config.name.replace(' ', '_') + '_Feed_Report_' + new Date().toISOString().slice(0, 10) + '.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    alert('Report has been exported successfully!');
}

function loadAllData() {
    var savedMovements = localStorage.getItem('blowBoatMovements');
    var savedHoppers = localStorage.getItem('blowBoatHoppers');
    
    if (savedMovements) {
        movements = JSON.parse(savedMovements);
    }
    if (savedHoppers) {
        hoppers = JSON.parse(savedHoppers);
    }
}

function saveAllData() {
    localStorage.setItem('blowBoatMovements', JSON.stringify(movements));
    localStorage.setItem('blowBoatHoppers', JSON.stringify(hoppers));
}

// Close modal when clicking outside
window.onclick = function(event) {
    var modal = document.getElementById('addForm');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}
