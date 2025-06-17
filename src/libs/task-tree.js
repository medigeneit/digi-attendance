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

        if (node.children_tasks && node.children_tasks.length) {
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