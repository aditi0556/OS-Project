// OS Memory Allocation Emulator - MVT and MFT Implementation
class MemoryAllocationEmulator {
    constructor() {
        this.totalMemory = 100;
        this.allocationType = 'mvt'; // 'mvt' or 'mft'
        this.memoryBlocks = [];
        this.processes = [];
        this.processCounter = 1;
        this.partitionSize = 20; // For MFT
        
        this.initializeMemory();
        this.bindEvents();
        this.updateDisplay();
    }

    initializeMemory() {
        this.memoryBlocks = [];
        this.processes = [];
        
        if (this.allocationType === 'mft') {
            // Fixed partitions for MFT
            const numPartitions = Math.floor(this.totalMemory / this.partitionSize);
            for (let i = 0; i < numPartitions; i++) {
                this.memoryBlocks.push({
                    id: i,
                    start: i * this.partitionSize,
                    size: this.partitionSize,
                    process: null,
                    status: 'free',
                    type: 'fixed'
                });
            }
        } else {
            // Single variable block for MVT
            this.memoryBlocks.push({
                id: 0,
                start: 0,
                size: this.totalMemory,
                process: null,
                status: 'free',
                type: 'variable'
            });
        }
    }

    bindEvents() {
        // Radio button events
        document.getElementById('mvt-option').addEventListener('change', () => {
            this.allocationType = 'mvt';
            document.getElementById('partitionSizeGroup').style.display = 'none';
            this.initializeMemory();
            this.updateDisplay();
        });

        document.getElementById('mft-option').addEventListener('change', () => {
            this.allocationType = 'mft';
            document.getElementById('partitionSizeGroup').style.display = 'block';
            this.initializeMemory();
            this.updateDisplay();
        });

        // Total memory change
        document.getElementById('totalMemory').addEventListener('change', (e) => {
            this.totalMemory = parseInt(e.target.value);
            this.initializeMemory();
            this.updateDisplay();
        });

        // Partition size change for MFT
        document.getElementById('partitionSize').addEventListener('change', (e) => {
            this.partitionSize = parseInt(e.target.value);
            if (this.allocationType === 'mft') {
                this.initializeMemory();
                this.updateDisplay();
            }
        });

        // Button events
        document.getElementById('allocateMemory').addEventListener('click', () => {
            this.allocateMemory();
        });

        document.getElementById('compactMemory').addEventListener('click', () => {
            this.compactMemory();
        });

        document.getElementById('resetMemory').addEventListener('click', () => {
            this.resetMemory();
        });
    }

    allocateMemory() {
        const processName = document.getElementById('processName').value.trim();
        const processSize = parseInt(document.getElementById('processSize').value);

        if (!processName) {
            this.showNotification('Please enter a process name', 'error');
            return;
        }

        if (processSize <= 0) {
            this.showNotification('Process size must be greater than 0', 'error');
            return;
        }

        let result;
        if (this.allocationType === 'mft') {
            result = this.allocateMFT(processName, processSize);
        } else {
            result = this.allocateMVT(processName, processSize);
        }

        if (result.success) {
            document.getElementById('processName').value = '';
            this.processCounter++;
        }

        this.showNotification(result.message, result.success ? 'success' : 'error');
        this.updateDisplay();
    }

    allocateMFT(processName, processSize) {
        // Find a free partition that can accommodate process
        const availablePartition = this.memoryBlocks.find(block => 
            block.status === 'free' && block.size >= processSize
        );

        if (!availablePartition) {
            return { 
                success: false, 
                message: `No suitable partition available for process ${processName} (${processSize} units)` 
            };
        }

        // Check if process size exceeds partition size
        if (processSize > this.partitionSize) {
            return { 
                success: false, 
                message: `Process ${processName} size (${processSize} units) exceeds partition size (${this.partitionSize} units)` 
            };
        }

        // Allocate process to partition
        availablePartition.process = {
            name: processName,
            size: processSize,
            internalFragmentation: this.partitionSize - processSize
        };
        availablePartition.status = 'occupied';

        this.processes.push({
            name: processName,
            size: processSize,
            blockId: availablePartition.id,
            start: availablePartition.start
        });

        return { 
            success: true, 
            message: `Process ${processName} allocated to partition at ${availablePartition.start} units`,
            internalFragmentation: this.partitionSize - processSize
        };
    }

    allocateMVT(processName, processSize) {
        // Find a free block using first-fit algorithm
        let blockIndex = -1;
        
        for (let i = 0; i < this.memoryBlocks.length; i++) {
            if (this.memoryBlocks[i].status === 'free' && this.memoryBlocks[i].size >= processSize) {
                blockIndex = i;
                break;
            }
        }

        if (blockIndex === -1) {
            return { 
                success: false, 
                message: `No suitable block available for process ${processName} (${processSize} units)` 
            };
        }

        const block = this.memoryBlocks[blockIndex];
        const remainingSize = block.size - processSize;

        // Allocate process to block
        block.process = {
            name: processName,
            size: processSize
        };
        block.status = 'occupied';
        block.size = processSize;

        // If there's remaining space, create a new free block
        if (remainingSize > 0) {
            const newBlock = {
                id: this.memoryBlocks.length,
                start: block.start + processSize,
                size: remainingSize,
                process: null,
                status: 'free',
                type: 'variable'
            };
            this.memoryBlocks.splice(blockIndex + 1, 0, newBlock);
        }

        this.processes.push({
            name: processName,
            size: processSize,
            blockId: block.id,
            start: block.start
        });

        return { 
            success: true, 
            message: `Process ${processName} allocated at ${block.start} units`,
            allocatedSize: processSize
        };
    }

    deallocateMemory(processName) {
        const processIndex = this.processes.findIndex(p => p.name === processName);
        
        if (processIndex === -1) {
            this.showNotification(`Process ${processName} not found`, 'error');
            return;
        }

        const process = this.processes[processIndex];
        const block = this.memoryBlocks.find(b => b.id === process.blockId);

        if (block) {
            block.process = null;
            block.status = 'free';
            
            // For MVT, try to coalesce with adjacent free blocks
            if (this.allocationType === 'mvt') {
                this.coalesceMemory(block);
            }
        }

        this.processes.splice(processIndex, 1);

        this.showNotification(`Process ${processName} terminated successfully`, 'success');
        this.updateDisplay();
    }

    coalesceMemory(block) {
        const blockIndex = this.memoryBlocks.findIndex(b => b.id === block.id);
        
        // Coalesce with previous free block
        if (blockIndex > 0 && this.memoryBlocks[blockIndex - 1].status === 'free') {
            const prevBlock = this.memoryBlocks[blockIndex - 1];
            prevBlock.size += block.size;
            this.memoryBlocks.splice(blockIndex, 1);
            
            // Update process references
            this.processes.forEach(process => {
                if (process.blockId === block.id) {
                    process.blockId = prevBlock.id;
                }
            });
            
            return this.coalesceMemory(prevBlock);
        }
        
        // Coalesce with next free block
        if (blockIndex < this.memoryBlocks.length - 1 && this.memoryBlocks[blockIndex + 1].status === 'free') {
            const nextBlock = this.memoryBlocks[blockIndex + 1];
            block.size += nextBlock.size;
            this.memoryBlocks.splice(blockIndex + 1, 1);
            
            // Update process references
            this.processes.forEach(process => {
                if (process.blockId === nextBlock.id) {
                    process.blockId = block.id;
                }
            });
            
            return this.coalesceMemory(block);
        }
    }

    compactMemory() {
        if (this.allocationType === 'mft') {
            this.showNotification('Memory compaction is not applicable for MFT', 'info');
            return;
        }

        if (this.processes.length === 0) {
            this.showNotification('No processes to compact', 'info');
            return;
        }

        // Sort processes by start address
        const sortedProcesses = [...this.processes].sort((a, b) => a.start - b.start);
        
        // Create new memory layout
        this.memoryBlocks = [];
        let currentStart = 0;

        sortedProcesses.forEach(process => {
            this.memoryBlocks.push({
                id: this.memoryBlocks.length,
                start: currentStart,
                size: process.size,
                process: { name: process.name, size: process.size },
                status: 'occupied',
                type: 'variable'
            });
            
            process.start = currentStart;
            process.blockId = this.memoryBlocks[this.memoryBlocks.length - 1].id;
            currentStart += process.size;
        });

        // Add remaining free space
        if (currentStart < this.totalMemory) {
            this.memoryBlocks.push({
                id: this.memoryBlocks.length,
                start: currentStart,
                size: this.totalMemory - currentStart,
                process: null,
                status: 'free',
                type: 'variable'
            });
        }

        this.showNotification('Memory compacted successfully', 'success');
        this.updateDisplay();
    }

    resetMemory() {
        this.processCounter = 1;
        this.initializeMemory();
        this.updateDisplay();
        this.showNotification('Memory reset successfully', 'success');
    }

    calculateFragmentation() {
        if (this.allocationType === 'mft') {
            // Internal Fragmentation for MFT
            let internalFragmentation = 0;
            this.memoryBlocks.forEach(block => {
                if (block.status === 'occupied' && block.process) {
                    internalFragmentation += (block.size - block.process.size);
                }
            });
            return internalFragmentation;
        } else {
            // External Fragmentation for MVT
            const freeBlocks = this.memoryBlocks.filter(block => block.status === 'free');
            if (freeBlocks.length <= 1) return 0;
            
            const totalFree = freeBlocks.reduce((total, block) => total + block.size, 0);
            const largestFree = Math.max(...freeBlocks.map(b => b.size));
            return totalFree - largestFree;
        }
    }

    getStatistics() {
        const usedMemory = this.processes.reduce((total, process) => total + process.size, 0);
        const fragmentation = this.calculateFragmentation();
        
        if (this.allocationType === 'mft') {
            // For MFT, calculate actual vs general memory
            const occupiedBlocks = this.memoryBlocks.filter(b => b.status === 'occupied');
            const actualUsedMemory = occupiedBlocks.reduce((total, block) => total + block.size, 0);
            const freeBlocks = this.memoryBlocks.filter(b => b.status === 'free');
            const actualFreeMemory = freeBlocks.reduce((total, block) => total + block.size, 0);
            
            return {
                totalMemory: this.totalMemory,
                usedMemory: usedMemory,
                actualUsedMemory: actualUsedMemory,
                freeMemory: this.totalMemory - usedMemory,
                actualFreeMemory: actualFreeMemory,
                fragmentation: fragmentation,
                allocationType: this.allocationType
            };
        } else {
            // For MVT, normal calculation
            const freeMemory = this.totalMemory - usedMemory;
            
            return {
                totalMemory: this.totalMemory,
                usedMemory: usedMemory,
                freeMemory: freeMemory,
                fragmentation: fragmentation,
                allocationType: this.allocationType
            };
        }
    }

    updateDisplay() {
        this.updateMemoryMap();
        this.updateProcessList();
        this.updateStatistics();
    }

    updateMemoryMap() {
        const memoryMap = document.getElementById('memoryMap');
        memoryMap.innerHTML = '';

        this.memoryBlocks.forEach(block => {
            const blockElement = document.createElement('div');
            blockElement.className = `memory-block ${block.status === 'occupied' ? 'allocated' : 'free'}`;
            
            const percentage = (block.size / this.totalMemory) * 100;
            blockElement.style.width = `${Math.max(percentage, 2)}%`;
            
            if (block.status === 'occupied' && block.process) {
                let fragmentationText = '';
                if (block.process.internalFragmentation > 0) {
                    fragmentationText = ` (IF: ${block.process.internalFragmentation})`;
                }
                blockElement.innerHTML = `
                    <span>${block.process.name}</span>
                    <span>${block.process.size}${fragmentationText}</span>
                `;
            } else {
                blockElement.innerHTML = `
                    <span>Free</span>
                    <span>${block.size}</span>
                `;
            }
            
            memoryMap.appendChild(blockElement);
        });
    }

    updateProcessList() {
        const processList = document.getElementById('activeProcesses');
        processList.innerHTML = '';

        if (this.processes.length === 0) {
            processList.innerHTML = '<p class="empty-state">No active processes</p>';
            return;
        }

        this.processes.forEach(process => {
            const processElement = document.createElement('div');
            processElement.className = 'process-item';
            
            // Get block to check for internal fragmentation
            const block = this.memoryBlocks.find(b => b.id === process.blockId);
            let internalFragmentation = 0;
            if (block && block.process && block.process.internalFragmentation) {
                internalFragmentation = block.process.internalFragmentation;
            }
            
            processElement.innerHTML = `
                <span class="process-name">${process.name} (${process.size} units)</span>
                <div class="process-details">
                    <span class="process-location">Location: ${process.start} - ${process.start + process.size}</span>
                    ${internalFragmentation > 0 ? `<span class="internal-frag">Internal Fragmentation: ${internalFragmentation} units</span>` : ''}
                    <button class="remove-process" onclick="memoryEmulator.deallocateMemory('${process.name}')">Terminate</button>
                </div>
            `;
            processList.appendChild(processElement);
        });
    }

    updateStatistics() {
        const stats = this.getStatistics();
        
        document.getElementById('totalMemoryStat').textContent = `${stats.totalMemory} units`;
        
        if (stats.allocationType === 'mft') {
            // Show both general and actual memory for MFT
            document.getElementById('usedMemoryStat').innerHTML = `
                General: ${stats.usedMemory} units<br>
                <small style="color: var(--muted)">Actual: ${stats.actualUsedMemory} units</small>
            `;
            document.getElementById('freeMemoryStat').innerHTML = `
                General: ${stats.freeMemory} units<br>
                <small style="color: var(--muted)">Actual: ${stats.actualFreeMemory} units</small>
            `;
        } else {
            // Normal display for MVT
            document.getElementById('usedMemoryStat').textContent = `${stats.usedMemory} units`;
            document.getElementById('freeMemoryStat').textContent = `${stats.freeMemory} units`;
        }
        
        const fragmentationType = this.allocationType === 'mft' ? 'Internal' : 'External';
        document.getElementById('fragmentationStat').textContent = `${fragmentationType}: ${stats.fragmentation} units`;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Initialize emulator when page loads
let memoryEmulator;

document.addEventListener('DOMContentLoaded', () => {
    memoryEmulator = new MemoryAllocationEmulator();
});

// Make the emulator globally accessible for button onclick handlers
window.memoryEmulator = memoryEmulator;
