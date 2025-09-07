import { ref } from "vue";


export const useTaskTree = () => {

  const tasks = ref()
  const parent_id = ref(0)

  function setTaskList(taskList, parentId){
    tasks.value = taskList
    parent_id.value = parentId
  }

  function getFlattenedTasks() {
    const result = [];

    const traverse = (nodes, depth = 0, path = '') => {
      nodes.forEach(node => {

        result.push({
          ...node,
          depth,
          idPath: path + node.id
        });

        if (node.children_tasks && node.children_tasks?.length) {
          traverse(node.children_tasks, depth + 1, path + node.id + '-');
        }

      });
    };

    traverse(getTaskListTree());
    return result;
  }

  function buildTree(list, parentId = 0) {
    if( Array.isArray(list) === false || list.length === 0) {
      return []
    }

    // return list;

    return list
      .filter(item => item.parent_id === parentId)
      .map(item => ({
        ...item,
        children_tasks: buildTree(list, item.id)
      }));
  }

  function getTaskListTree(){
    return buildTree(tasks.value, parent_id.value);
  }

  return {
    getTaskListTree,
    getFlattenedTasks,
    setTaskList
  }
}

export const getTreeList = (taskList, parentId) => {
  const tree = useTaskTree()
  tree.setTaskList(taskList, parentId)
  return tree.getTaskListTree()
}

function taskClientSideFilter(task, filters) {

  let matched = true

  if (filters?.['user-ids']) {
    matched = matched && task?.users?.some((user) => user.id == filters?.['user-ids'])
  }

  if (filters?.['status']) {
    const statusValue = {
      'not-completed': ['IN_PROGRESS', 'PENDING'],
      'only-completed': ['COMPLETED'],
    }

    const statusList = statusValue?.[filters?.['status']]

    matched = matched && statusList.includes(task?.status)
  }


  if( task?.children_tasks?.length > 0) {
    return matched && task?.children_tasks?.filter(
      childTask => taskClientSideFilter( childTask, filters)
    ).length > 0
  }

  return matched
}

export function mapAndFilterTask(taskList, filters) {

  const getTaskPriority = (t) => {
    if (t.is_urgent && t.is_important) return 4
    if (t.is_urgent) return 3
    if (t.is_important) return 2
    if (t.is_target) return 1
    return 0
  }

  return taskList
    ?.filter((childTask) => taskClientSideFilter(childTask, filters))
    ?.map((childTask) => {
      return {
        ...childTask,
        children_tasks:
          childTask.children_tasks?.length > 0
            ? mapAndFilterTask(childTask.children_tasks, filters)
            : [],
      }
    })
    ?.sort((taskA, taskB) => {

      const pa = getTaskPriority(taskA)
      const pb = getTaskPriority(taskB)

      if (pb !== pa) return pb - pa

      if( taskB.priority !== taskA.priority) {
        return taskB.priority - taskA.priority
      }

      if( taskB.serial !== taskA.serial) {
        return taskB.serial - taskA.serial
      }

      return taskB.id - taskA.id

    }) || []
}
