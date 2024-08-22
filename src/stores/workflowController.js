/**
 * Workflow Controller Setup.
 *
 * Configures and controls the task execution workflow within a team context, using a queue system to manage the sequential
 * execution of tasks based on their statuses. It ensures tasks are processed in the correct order and handles status updates.
 *
 * Usage:
 * Integrate this controller to manage the flow of tasks within your application, ensuring tasks are executed in an orderly and efficient manner.
 */

import PQueue from 'p-queue';
import { TASK_STATUS_enum } from '../utils/enums';

export const setupWorkflowController = (useTeamStore) => {
    
    const taskQueue = new PQueue({ concurrency: 1 });

    // Managing tasks moving to 'DOING'
    useTeamStore.subscribe(
        state => state.tasks.filter(t => t.status === TASK_STATUS_enum.DOING),
        (doingTasks, previousDoingTasks) => {
            doingTasks.forEach(task => {
                if (!previousDoingTasks.find(t => t.id === task.id)) {
                    taskQueue.add(() => useTeamStore.getState().performTask(task.agent, task))
                        .catch(error => {
                            useTeamStore.getState().handleTaskError({ task, error });
                            useTeamStore.getState().handleWorkflowError(task, error);
                        });
                }
            });
        }
    );

    // Managing tasks moving to 'DONE'
    useTeamStore.subscribe(
        state => state.tasks.filter(t => t.status === 'DONE'),
        (doneTasks, previousDoneTasks) => {
            if (doneTasks.length > previousDoneTasks.length) {
                const tasks = useTeamStore.getState().tasks;
                const nextTask = tasks.find(t => t.status === TASK_STATUS_enum.TODO);
                if (nextTask) {
                    useTeamStore.getState().updateTaskStatus(nextTask.id, TASK_STATUS_enum.DOING);
                }
            }
        }
    );
};
