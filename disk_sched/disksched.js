class DiskScheduler {
    constructor() {
        this.requests = [];
        this.initialHead = 50;
        this.currentStep = -1;
        this.animationSteps = [];
        this.headPath = [];
        this.isAnimating = false;
        this.animationInterval = null;
        this.animationControls = null;

        this.initializeElements();
        this.initializeEventListeners();
        this.createDiskTrack();
        this.updateVisualization();
    }

    initializeElements() {
        this.algorithmSelect = document.getElementById('algorithm');
        this.directionSelect = document.getElementById('direction');
        this.directionSelector = document.getElementById('directionSelector');
        this.initialHeadInput = document.getElementById('initialHead');
        this.newRequestInput = document.getElementById('newRequest');
        this.addRequestButton = document.getElementById('addRequest');
        this.requestsList = document.getElementById('requestsList');
        this.diskTrack = document.getElementById('diskTrack');
        this.graph = document.getElementById('graph');
        this.prevStepButton = document.getElementById('prevStep');
        this.nextStepButton = document.getElementById('nextStep');
        this.playAnimationButton = document.getElementById('playAnimation');
        this.resetAnimationButton = document.getElementById('resetAnimation');
        this.currentHeadSpan = document.getElementById('currentHead');
        this.currentRequestSpan = document.getElementById('currentRequest');
        this.distanceMovedSpan = document.getElementById('distanceMoved');
        this.totalSeekTimeSpan = document.getElementById('totalSeekTime');
    }

    initializeEventListeners() {
        this.initialHeadInput.addEventListener('change', () => {
            this.initialHead = parseInt(this.initialHeadInput.value) || 50;
            this.updateVisualization();
        });

        this.addRequestButton.addEventListener('click', () => {
            this.addNewRequest();
        });

        this.newRequestInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                this.addNewRequest();
            }
        });

        this.prevStepButton.addEventListener('click', () => this.handlePrevStep());
        this.nextStepButton.addEventListener('click', () => this.handleNextStep());
        this.playAnimationButton.addEventListener('click', () => this.handlePlayAnimation());
        this.resetAnimationButton.addEventListener('click', () => this.handleResetAnimation());
        this.algorithmSelect.addEventListener('change', () => {
            // Show/hide direction selector based on algorithm
            const showDirection = ['SCAN', 'CSCAN', 'LOOK', 'CLOOK'].includes(this.algorithmSelect.value);
            this.directionSelector.style.display = showDirection ? 'block' : 'none';
            this.updateVisualization();
        });
        this.directionSelect.addEventListener('change', () => {
            this.updateVisualization();
        });
    }

    createDiskTrack() {
        this.diskTrack.innerHTML = '';
        for (let i = 0; i < 200; i++) {
            const block = document.createElement('div');
            block.className = 'track-block';
            this.diskTrack.appendChild(block);
        }
    }

    updateRequestsList() {
        this.requestsList.innerHTML = '';
        this.requests.forEach((request, index) => {
            const li = document.createElement('li');
            li.textContent = request;
            
            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.addEventListener('click', () => {
                this.requests.splice(index, 1);
                this.updateRequestsList();
                this.updateVisualization();
            });
            
            li.appendChild(removeButton);
            this.requestsList.appendChild(li);
        });
    }

    calculateAnimationSteps() {
        let steps = [];
        let currentHead = this.initialHead;
        let seekTime = 0;
        let remainingRequests = [...this.requests];
        let path = [currentHead];

        switch (this.algorithmSelect.value) {
            case 'FCFS':
                steps = this.requests.map(request => {
                    const distance = Math.abs(currentHead - request);
                    seekTime += distance;
                    currentHead = request;
                    path.push(currentHead);
                    return {
                        head: currentHead,
                        request,
                        distance,
                        totalSeekTime: seekTime
                    };
                });
                break;

            case 'SSTF':
                while (remainingRequests.length > 0) {
                    const nearestRequest = remainingRequests.reduce((prev, curr) => {
                        const prevDist = Math.abs(currentHead - prev);
                        const currDist = Math.abs(currentHead - curr);
                        return currDist < prevDist ? curr : prev;
                    });
                    const distance = Math.abs(currentHead - nearestRequest);
                    seekTime += distance;
                    currentHead = nearestRequest;
                    path.push(currentHead);
                    steps.push({
                        head: currentHead,
                        request: nearestRequest,
                        distance,
                        totalSeekTime: seekTime
                    });
                    remainingRequests = remainingRequests.filter(req => req !== nearestRequest);
                }
                break;

            case 'SCAN':
                remainingRequests.sort((a, b) => a - b);
                const requestsRight = remainingRequests.filter(req => req >= currentHead);
                const requestsLeft = remainingRequests.filter(req => req < currentHead).reverse();
                
                if (this.directionSelect.value === 'right') {
                    // Right to left traversal
                    requestsRight.forEach(request => {
                        const distance = Math.abs(currentHead - request);
                        seekTime += distance;
                        currentHead = request;
                        path.push(currentHead);
                        steps.push({
                            head: currentHead,
                            request,
                            distance,
                            totalSeekTime: seekTime
                        });
                    });

                    if (currentHead !== 199) {
                        const distance = 199 - currentHead;
                        seekTime += distance;
                        currentHead = 199;
                        path.push(currentHead);
                        steps.push({
                            head: currentHead,
                            request: null,
                            distance,
                            totalSeekTime: seekTime
                        });
                    }

                    requestsLeft.forEach(request => {
                        const distance = Math.abs(currentHead - request);
                        seekTime += distance;
                        currentHead = request;
                        path.push(currentHead);
                        steps.push({
                            head: currentHead,
                            request,
                            distance,
                            totalSeekTime: seekTime
                        });
                    });
                } else {
                    // Left to right traversal
                    requestsLeft.forEach(request => {
                        const distance = Math.abs(currentHead - request);
                        seekTime += distance;
                        currentHead = request;
                        path.push(currentHead);
                        steps.push({
                            head: currentHead,
                            request,
                            distance,
                            totalSeekTime: seekTime
                        });
                    });

                    if (currentHead !== 0) {
                        const distance = currentHead;
                        seekTime += distance;
                        currentHead = 0;
                        path.push(currentHead);
                        steps.push({
                            head: currentHead,
                            request: null,
                            distance,
                            totalSeekTime: seekTime
                        });
                    }

                    requestsRight.forEach(request => {
                        const distance = Math.abs(currentHead - request);
                        seekTime += distance;
                        currentHead = request;
                        path.push(currentHead);
                        steps.push({
                            head: currentHead,
                            request,
                            distance,
                            totalSeekTime: seekTime
                        });
                    });
                }
                break;

            case 'CSCAN':
                remainingRequests.sort((a, b) => a - b);
                const rightRequests = remainingRequests.filter(req => req >= currentHead);
                const leftRequests = remainingRequests.filter(req => req < currentHead);
                
                if (this.directionSelect.value === 'right') {
                    // Right to left traversal
                    rightRequests.forEach(request => {
                        const distance = Math.abs(currentHead - request);
                        seekTime += distance;
                        currentHead = request;
                        path.push(currentHead);
                        steps.push({
                            head: currentHead,
                            request,
                            distance,
                            totalSeekTime: seekTime
                        });
                    });

                    if (currentHead !== 199) {
                        const distance = 199 - currentHead;
                        seekTime += distance;
                        currentHead = 199;
                        path.push(currentHead);
                        steps.push({
                            head: currentHead,
                            request: null,
                            distance,
                            totalSeekTime: seekTime
                        });
                    }

                    const returnDistance = 199;
                    seekTime += returnDistance;
                    currentHead = 0;
                    path.push(currentHead);
                    steps.push({
                        head: currentHead,
                        request: null,
                        distance: returnDistance,
                        totalSeekTime: seekTime
                    });

                    leftRequests.forEach(request => {
                        const distance = Math.abs(currentHead - request);
                        seekTime += distance;
                        currentHead = request;
                        path.push(currentHead);
                        steps.push({
                            head: currentHead,
                            request,
                            distance,
                            totalSeekTime: seekTime
                        });
                    });
                } else {
                    // Left to right traversal
                    leftRequests.forEach(request => {
                        const distance = Math.abs(currentHead - request);
                        seekTime += distance;
                        currentHead = request;
                        path.push(currentHead);
                        steps.push({
                            head: currentHead,
                            request,
                            distance,
                            totalSeekTime: seekTime
                        });
                    });

                    if (currentHead !== 0) {
                        const distance = currentHead;
                        seekTime += distance;
                        currentHead = 0;
                        path.push(currentHead);
                        steps.push({
                            head: currentHead,
                            request: null,
                            distance,
                            totalSeekTime: seekTime
                        });
                    }

                    const returnDistance = 199;
                    seekTime += returnDistance;
                    currentHead = 199;
                    path.push(currentHead);
                    steps.push({
                        head: currentHead,
                        request: null,
                        distance: returnDistance,
                        totalSeekTime: seekTime
                    });

                    rightRequests.forEach(request => {
                        const distance = Math.abs(currentHead - request);
                        seekTime += distance;
                        currentHead = request;
                        path.push(currentHead);
                        steps.push({
                            head: currentHead,
                            request,
                            distance,
                            totalSeekTime: seekTime
                        });
                    });
                }
                break;

            case 'LOOK':
                remainingRequests.sort((a, b) => a - b);
                const rightLook = remainingRequests.filter(req => req >= currentHead);
                const leftLook = remainingRequests.filter(req => req < currentHead).reverse();
                
                if (this.directionSelect.value === 'right') {
                    // Right to left traversal
                    rightLook.forEach(request => {
                        const distance = Math.abs(currentHead - request);
                        seekTime += distance;
                        currentHead = request;
                        path.push(currentHead);
                        steps.push({
                            head: currentHead,
                            request,
                            distance,
                            totalSeekTime: seekTime
                        });
                    });

                    leftLook.forEach(request => {
                        const distance = Math.abs(currentHead - request);
                        seekTime += distance;
                        currentHead = request;
                        path.push(currentHead);
                        steps.push({
                            head: currentHead,
                            request,
                            distance,
                            totalSeekTime: seekTime
                        });
                    });
                } else {
                    // Left to right traversal
                    leftLook.forEach(request => {
                        const distance = Math.abs(currentHead - request);
                        seekTime += distance;
                        currentHead = request;
                        path.push(currentHead);
                        steps.push({
                            head: currentHead,
                            request,
                            distance,
                            totalSeekTime: seekTime
                        });
                    });

                    rightLook.forEach(request => {
                        const distance = Math.abs(currentHead - request);
                        seekTime += distance;
                        currentHead = request;
                        path.push(currentHead);
                        steps.push({
                            head: currentHead,
                            request,
                            distance,
                            totalSeekTime: seekTime
                        });
                    });
                }
                break;

            case 'CLOOK':
                remainingRequests.sort((a, b) => a - b);
                const rightCLook = remainingRequests.filter(req => req >= currentHead);
                const leftCLook = remainingRequests.filter(req => req < currentHead);
                
                if (this.directionSelect.value === 'right') {
                    // Right to left traversal
                    rightCLook.forEach(request => {
                        const distance = Math.abs(currentHead - request);
                        seekTime += distance;
                        currentHead = request;
                        path.push(currentHead);
                        steps.push({
                            head: currentHead,
                            request,
                            distance,
                            totalSeekTime: seekTime
                        });
                    });

                    if (leftCLook.length > 0) {
                        // Add the distance from highest request to lowest request
                        const highestRequest = currentHead;  // This will be the last request served
                        const lowestRequest = Math.min(...leftCLook);
                        const jumpDistance = highestRequest - lowestRequest;
                        seekTime += jumpDistance;
                        
                        // Jump to the lowest request and serve it immediately
                        currentHead = lowestRequest;
                        path.push(currentHead);
                        steps.push({
                            head: currentHead,
                            request: lowestRequest,
                            distance: jumpDistance,
                            totalSeekTime: seekTime
                        });

                        // Then serve all remaining requests from lowest to highest
                        leftCLook.slice(1).forEach(request => {
                            const distance = Math.abs(currentHead - request);
                            seekTime += distance;
                            currentHead = request;
                            path.push(currentHead);
                            steps.push({
                                head: currentHead,
                                request,
                                distance,
                                totalSeekTime: seekTime
                            });
                        });
                    }
                } else {
                    // Left to right traversal
                    leftCLook.forEach(request => {
                        const distance = Math.abs(currentHead - request);
                        seekTime += distance;
                        currentHead = request;
                        path.push(currentHead);
                        steps.push({
                            head: currentHead,
                            request,
                            distance,
                            totalSeekTime: seekTime
                        });
                    });

                    if (rightCLook.length > 0) {
                        // Add the distance from lowest request to highest request
                        const lowestRequest = currentHead;  // This will be the last request served
                        const highestRequest = Math.max(...rightCLook);
                        const jumpDistance = highestRequest - lowestRequest;
                        seekTime += jumpDistance;
                        
                        // Jump to the highest request and serve it immediately
                        currentHead = highestRequest;
                        path.push(currentHead);
                        steps.push({
                            head: currentHead,
                            request: highestRequest,
                            distance: jumpDistance,
                            totalSeekTime: seekTime
                        });

                        // Then serve all remaining requests from highest to lowest
                        rightCLook.reverse().slice(1).forEach(request => {
                            const distance = Math.abs(currentHead - request);
                            seekTime += distance;
                            currentHead = request;
                            path.push(currentHead);
                            steps.push({
                                head: currentHead,
                                request,
                                distance,
                                totalSeekTime: seekTime
                            });
                        });
                    }
                }
                break;
        }

        this.animationSteps = steps;
        this.headPath = path;
    }

    updateVisualization() {
        this.calculateAnimationSteps();
        this.currentStep = -1;
        this.updateDiskTrack();
        this.updateGraph();
        this.updateStats();
        this.updateControls();
    }

    updateDiskTrack() {
        const blocks = this.diskTrack.querySelectorAll('.track-block');
        blocks.forEach(block => {
            block.classList.remove('head-position', 'request-position');
        });

        if (this.currentStep >= 0) {
            const currentStep = this.animationSteps[this.currentStep];
            blocks[currentStep.head].classList.add('head-position');
            if (currentStep.request !== null) {
                blocks[currentStep.request].classList.add('request-position');
            }
        } else {
            blocks[this.initialHead].classList.add('head-position');
        }
    }

    updateGraph() {
        this.graph.innerHTML = '';
        
        // Create a container for the graph with proper scaling
        const graphContainer = document.createElement('div');
        graphContainer.className = 'graph-container';
        
        // Add graph title
        const graphTitle = document.createElement('h3');
        graphTitle.textContent = 'Head Movement Graph';
        graphContainer.appendChild(graphTitle);

        // Create the main graph area
        const graphArea = document.createElement('div');
        graphArea.className = 'graph';
        graphContainer.appendChild(graphArea);

        // Add Y-axis
        const yAxis = document.createElement('div');
        yAxis.className = 'y-axis';
        graphArea.appendChild(yAxis);

        // Add Y-axis labels (0 to 199)
        for (let i = 0; i <= 199; i += 20) {
            const label = document.createElement('div');
            label.textContent = i;
            label.style.bottom = `${(i / 199) * 100}%`;
            yAxis.appendChild(label);
        }

        // Add X-axis
        const xAxis = document.createElement('div');
        xAxis.className = 'x-axis';
        graphArea.appendChild(xAxis);

        // Add X-axis labels (0 to 199)
        for (let i = 0; i <= 199; i += 20) {
            const label = document.createElement('div');
            label.textContent = i;
            label.style.left = `${(i / 199) * 100}%`;
            xAxis.appendChild(label);
        }

        // Create SVG for lines
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'none');
        graphArea.appendChild(svg);

        // Add arrowhead marker definition
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '2');
        marker.setAttribute('markerHeight', '2');
        marker.setAttribute('refX', '1.75');
        marker.setAttribute('refY', '1');
        marker.setAttribute('orient', 'auto');
        marker.setAttribute('markerUnits', 'strokeWidth');

        const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrowPath.setAttribute('d', 'M0,0 L0,2 L2,1 z');
        arrowPath.setAttribute('fill', '#646cff');
        marker.appendChild(arrowPath);
        defs.appendChild(marker);
        svg.appendChild(defs);

        // Draw grid lines
        const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gridGroup.setAttribute('stroke', '#333');
        gridGroup.setAttribute('stroke-width', '1');
        
        // Vertical grid lines
        for (let i = 0; i <= 199; i += 20) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            const x = `${(i / 199) * 100}%`;
            line.setAttribute('x1', x);
            line.setAttribute('x2', x);
            line.setAttribute('y1', '0');
            line.setAttribute('y2', '100%');
            gridGroup.appendChild(line);
        }
        
        // Horizontal grid lines
        for (let i = 0; i <= 199; i += 20) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            const y = `${(i / 199) * 100}%`;
            line.setAttribute('x1', '0');
            line.setAttribute('x2', '100%');
            line.setAttribute('y1', y);
            line.setAttribute('y2', y);
            gridGroup.appendChild(line);
        }
        
        svg.appendChild(gridGroup);

        // Draw directional movement segments
        this.headPath.forEach((position, index) => {
            if (index === 0) return;

            const previous = this.headPath[index - 1];
            const segment = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            const x1 = (previous / 199) * 100;
            const y1 = ((index - 1) / (this.headPath.length - 1)) * 100;
            const x2 = (position / 199) * 100;
            const y2 = (index / (this.headPath.length - 1)) * 100;

            segment.setAttribute('x1', `${x1}%`);
            segment.setAttribute('y1', `${y1}%`);
            segment.setAttribute('x2', `${x2}%`);
            segment.setAttribute('y2', `${y2}%`);
            const isActiveSegment = index <= this.currentStep + 1;
            segment.setAttribute('stroke', isActiveSegment ? '#646cff' : '#444');
            segment.setAttribute('stroke-width', '0.2');
            segment.setAttribute('stroke-linecap', 'round');
            segment.setAttribute('marker-end', 'url(#arrowhead)');
            segment.setAttribute('opacity', isActiveSegment ? '1' : '0.3');
            svg.appendChild(segment);
        });

        // Add points
        this.headPath.forEach((position, index) => {
            const point = document.createElement('div');
            point.className = `graph-point ${index <= this.currentStep + 1 ? 'active' : ''}`;
            point.style.left = `${(position / 199) * 100}%`;
            point.style.top = `${(index / (this.headPath.length - 1)) * 100}%`;
            graphArea.appendChild(point);
        });

        // Add animated head
        const animatedHead = document.createElement('div');
        animatedHead.className = 'animated-head';
        const currentStep = this.animationSteps[this.currentStep];
        animatedHead.style.left = `${((currentStep?.head ?? this.initialHead) / 199) * 100}%`;
        animatedHead.style.top = `${((this.currentStep + 1) / (this.headPath.length - 1)) * 100}%`;
        graphArea.appendChild(animatedHead);

        this.graph.appendChild(graphContainer);

        // Update sequence list
        const sequenceList = document.getElementById('sequenceList');
        sequenceList.innerHTML = '';
        
        this.headPath.forEach((position, index) => {
            const step = document.createElement('div');
            step.className = `sequence-step ${index <= this.currentStep + 1 ? 'active' : ''}`;
            step.textContent = position;
            sequenceList.appendChild(step);
        });
    }

    updateStats() {
        const currentStep = this.animationSteps[this.currentStep];
        this.currentHeadSpan.textContent = currentStep?.head || this.initialHead;
        this.currentRequestSpan.textContent = currentStep?.request || '-';
        this.distanceMovedSpan.textContent = currentStep?.distance || 0;
        this.totalSeekTimeSpan.textContent = currentStep?.totalSeekTime || 0;
    }

    updateControls() {
        this.prevStepButton.disabled = this.currentStep === -1;
        this.nextStepButton.disabled = this.currentStep === this.animationSteps.length - 1;
        this.playAnimationButton.textContent = this.isAnimating ? 'Stop Animation' : 'Start Animation';
    }

    handlePrevStep() {
        if (this.currentStep >= 0) {
            this.currentStep--;
            this.updateDiskTrack();
            this.updateGraph();
            this.updateStats();
            this.updateControls();
        }
    }

    handleNextStep() {
        if (this.currentStep < this.animationSteps.length - 1) {
            this.currentStep++;
            this.updateDiskTrack();
            this.updateGraph();
            this.updateStats();
            this.updateControls();
        }
    }

    handlePlayAnimation() {
        if (this.isAnimating) {
            clearInterval(this.animationInterval);
            this.isAnimating = false;
        } else {
            this.isAnimating = true;
            this.animationInterval = setInterval(() => {
                if (this.currentStep < this.animationSteps.length - 1) {
                    this.currentStep++;
                    this.updateDiskTrack();
                    this.updateGraph();
                    this.updateStats();
                    this.updateControls();
                } else {
                    clearInterval(this.animationInterval);
                    this.isAnimating = false;
                    this.updateControls();
                }
            }, 1000);
        }
        this.updateControls();
    }

    handleResetAnimation() {
        // Stop any ongoing animation
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
            this.isAnimating = false;
            this.playAnimationButton.textContent = 'Play Animation';
        }

        // Reset animation state while keeping inputs
        this.currentStep = -1;
        
        // Recalculate animation steps with current inputs
        this.calculateAnimationSteps();
        
        // Update visualization
        this.updateDiskTrack();
        this.updateGraph();
        this.updateStats();
        this.updateControls();
        
        // Reset head position to initial
        this.currentHeadSpan.textContent = this.initialHead;
        this.currentRequestSpan.textContent = '-';
        this.distanceMovedSpan.textContent = '0';
        this.totalSeekTimeSpan.textContent = '0';
    }

    addNewRequest() {
        const newRequest = parseInt(this.newRequestInput.value);
        if (!isNaN(newRequest) && newRequest >= 0 && newRequest <= 199) {
            this.requests.push(newRequest);
            this.updateRequestsList();
            this.updateVisualization();
            this.newRequestInput.value = '';
        }
    }
}

// Initialize the disk scheduler when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DiskScheduler();
});