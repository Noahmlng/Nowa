/**
 * TaskTest.ts
 * 
 * A test utility to demonstrate the TaskGraph system capabilities.
 * This file provides examples of how to use the various components.
 */

import { useAppStore } from '@/store/store';
import { taskBuilder } from './TaskBuilder';
import { taskAdjustmentEngine } from './TaskAdjustmentEngine';
import { generateTaskEmbeddings } from './index';

/**
 * Run a simple demonstration of the task graph system
 */
export async function runTaskGraphDemo(): Promise<void> {
  console.log('------ Starting Task Graph System Demo ------');
  
  // Get store
  const store = useAppStore.getState();
  
  // 1. Create a sample task using the pipeline system
  console.log('\n1. Creating a sample task through TaskBuilder pipeline:');
  const taskProposal = taskBuilder.generateTaskProposal('Complete weekly project review');
  console.log('Task Proposal:', taskProposal);
  
  // Create a full task from the proposal
  const task = taskBuilder.createTaskFromProposal(taskProposal);
  console.log('Created Task:', task);
  
  // Add the task to the store (store generates the ID automatically)
  const createdTaskId = `task-${Date.now()}`;
  store.addTask({
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    important: task.important,
    taskListId: task.taskListId,
    subtasks: task.subtasks
  });
  console.log('Task added to store with ID:', createdTaskId);
  
  // 2. Generate embeddings for the task
  console.log('\n2. Generating embeddings for the task:');
  const embeddings = await generateTaskEmbeddings(task.title + ' ' + (task.description || ''));
  console.log('Embeddings generated (first 5 values):', embeddings.slice(0, 5));
  
  // Add embeddings to the task
  store.updateTaskEmbeddings(createdTaskId, embeddings);
  console.log('Embeddings added to task');
  
  // 3. Create a related task
  console.log('\n3. Creating a related task:');
  const relatedTaskProposal = taskBuilder.generateTaskProposal('Prepare meeting notes for project discussion');
  const relatedTask = taskBuilder.createTaskFromProposal(relatedTaskProposal);
  
  // Add the task to the store (store generates the ID automatically)
  const relatedTaskId = `task-${Date.now() + 1}`;
  store.addTask({
    title: relatedTask.title,
    description: relatedTask.description || '',
    status: relatedTask.status,
    priority: relatedTask.priority,
    important: relatedTask.important,
    taskListId: relatedTask.taskListId,
    subtasks: relatedTask.subtasks
  });
  console.log('Related task added to store with ID:', relatedTaskId);
  
  // 4. Create a relationship between the tasks
  console.log('\n4. Creating a task relationship:');
  store.addTaskEdge({
    fromTaskId: createdTaskId,
    toTaskId: relatedTaskId,
    type: 'related',
    weight: 0.8
  });
  console.log('Task relationship created');
  
  // 5. Adjust a task based on feedback
  console.log('\n5. Adjusting task based on feedback:');
  const adjustments = taskAdjustmentEngine.adjustTask(
    createdTaskId, 
    'This is urgent and needs to be done by tomorrow'
  );
  console.log('Task adjustments applied:', adjustments);
  
  // 6. Find related tasks
  console.log('\n6. Finding semantically related tasks:');
  const relatedTasks = store.findSimilarTasks(embeddings, 0.3);
  console.log('Found related tasks:', relatedTasks.map(t => t.title));
  
  console.log('\n------ Task Graph System Demo Complete ------');
}

/**
 * Export a function to run the demo from a component
 */
export function useDemoRunner() {
  return {
    runDemo: runTaskGraphDemo
  };
} 