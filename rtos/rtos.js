'use strict';

const RTOSAlgorithms = {

 edf: function(tasks, totalTime) {

    // Convert tasks → internal state
    let state = tasks.map(t => ({
      name: t.name,
      P: t.period,
      T: t.burst,
      remaining: 0,
      nextRelease: 0,
      deadline: t.period
    }));

    let timeline = [];
    let time = 0;
    let deadlineMissed = false;

    while (time < totalTime) {
      // Release jobs
      state.forEach(task => {
        if (time === task.nextRelease) {
          if (task.remaining > 0) {
            deadlineMissed = true;
          }
          task.remaining = task.T; // WCET
          task.deadline = time + task.P;
          task.nextRelease += task.P;
        }
      });

      // Get ready tasks
      let ready = state
        .filter(t => t.remaining > 0)
        .map(t => ({
          name: t.name,
          deadline: t.deadline,
          remaining: t.remaining
        }));

      let runningTask = null;
      let idle = false;

      if (ready.length === 0) {
        idle = true;
      } else {
        // EDF: pick earliest deadline
        ready.sort((a, b) => a.deadline - b.deadline);
        runningTask = ready[0].name;

        // reduce execution
        let taskObj = state.find(t => t.name === runningTask);
        taskObj.remaining--;
      }

      // Save step
      timeline.push({
        time,
        task: runningTask,
        idle,
        deadlineMissed,
        readyQueue: ready
      });

      deadlineMissed = false;
      time++;
    }

    // Utilization
    let utilization = tasks.reduce((sum, t) => {
      return sum + (t.burst / t.period); // WCET / Period
    }, 0);

    return {
      timeline,
      utilization
    };
  },
};