<template>
  <div class="p-6 min-h-screen bg-gray-100">
    <!-- Sortable Lists Section -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <!-- List 1 -->
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="text-lg font-semibold mb-4">List 1</h3>
        <ul
          ref="list1"
          class="sortable-list space-y-2 min-h-20"
          @dragover="onDragOver"
          @drop="onDrop($event, 'list1')"
        >
          <li
            v-for="item in list1Items"
            :key="item.id"
            :draggable="item.draggable"
            @dragstart="onDragStart($event, item, 'list1')"
            @dragend="onDragEnd"
            class="sortable-item p-3 rounded border transition-all duration-200"
            :class="getItemClasses(item)"
          >
            <div class="flex items-center justify-between">
              <span>{{ item.name }}</span>
              <span v-if="!item.draggable" class="text-xs text-red-500">(Locked)</span>
            </div>
          </li>
        </ul>
      </div>

      <!-- List 2 -->
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="text-lg font-semibold mb-4">List 2</h3>
        <ul
          ref="list2"
          class="sortable-list space-y-2 min-h-20"
          @dragover="onDragOver"
          @drop="onDrop($event, 'list2')"
        >
          <li
            v-for="item in list2Items"
            :key="item.id"
            :draggable="item.draggable"
            @dragstart="onDragStart($event, item, 'list2')"
            @dragend="onDragEnd"
            class="sortable-item p-3 rounded border transition-all duration-200"
            :class="getItemClasses(item)"
          >
            <div class="flex items-center justify-between">
              <span>{{ item.name }}</span>
              <span v-if="!item.draggable" class="text-xs text-red-500">(Locked)</span>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Hierarchical List Section -->
    <div class="bg-white rounded-lg shadow p-4">
      <h3 class="text-lg font-semibold mb-4">Hierarchical List</h3>
      <div class="hierarchical-list space-y-2" @dragover="onDragOver" @drop="onHierarchicalDrop">
        <div v-for="item in hierarchicalItems" :key="item.id" class="hierarchical-item">
          <div
            :draggable="item.draggable"
            @dragstart="onHierarchicalDragStart($event, item)"
            @dragend="onDragEnd"
            class="parent-item p-3 rounded border mb-2 transition-all duration-200"
            :class="getHierarchicalItemClasses(item)"
          >
            <div class="flex items-center justify-between">
              <span>{{ item.name }}</span>
              <span v-if="!item.draggable" class="text-xs text-red-500">(Locked)</span>
            </div>
          </div>

          <!-- Sub-items -->
          <div
            v-if="item.children && item.children.length"
            class="sub-list ml-6 pl-4 border-l-2 border-gray-300 space-y-2 min-h-4"
            @dragover="onDragOver"
            @drop="onSubListDrop($event, item)"
          >
            <div
              v-for="child in item.children"
              :key="child.id"
              :draggable="child.draggable"
              @dragstart="onHierarchicalDragStart($event, child, item)"
              @dragend="onDragEnd"
              class="child-item p-2 rounded border text-sm transition-all duration-200"
              :class="getHierarchicalItemClasses(child)"
            >
              <div class="flex items-center justify-between">
                <span>{{ child.name }}</span>
                <span v-if="!child.draggable" class="text-xs text-red-500">(Locked)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Drag State Indicator -->
    <div
      v-if="isDragging"
      class="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg"
    >
      Dragging: {{ draggedItem?.name }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'DragDropDemo',
  data() {
    return {
      isDragging: false,
      draggedItem: null,
      sourceList: null,
      parentItem: null,
      dragOverElement: null,

      list1Items: [
        { id: 1, name: 'Item 1', draggable: true },
        { id: 2, name: 'Item 2 (Locked)', draggable: false },
        { id: 3, name: 'Item 3', draggable: true },
        { id: 4, name: 'Item 4', draggable: true },
      ],

      list2Items: [
        { id: 5, name: 'Item 5', draggable: true },
        { id: 6, name: 'Item 6', draggable: true },
        { id: 7, name: 'Item 7 (Locked)', draggable: false },
      ],

      hierarchicalItems: [
        {
          id: 8,
          name: 'Parent 1',
          draggable: true,
          children: [
            { id: 9, name: 'Child 1.1', draggable: true },
            { id: 10, name: 'Child 1.2 (Locked)', draggable: false },
          ],
        },
        {
          id: 11,
          name: 'Parent 2 (Locked)',
          draggable: false,
          children: [{ id: 12, name: 'Child 2.1', draggable: true }],
        },
        {
          id: 13,
          name: 'Parent 3',
          draggable: true,
          children: [],
        },
      ],
    }
  },

  methods: {
    // Drag Start Handler
    onDragStart(event, item, listName) {
      if (!item.draggable) {
        event.preventDefault()
        return
      }

      this.isDragging = true
      this.draggedItem = item
      this.sourceList = listName

      event.dataTransfer.setData('text/plain', item.id)
      event.dataTransfer.effectAllowed = 'move'

      // Visual feedback
      event.target.classList.add('opacity-50')
    },

    // Hierarchical Drag Start
    onHierarchicalDragStart(event, item, parent = null) {
      if (!item.draggable) {
        event.preventDefault()
        return
      }

      this.isDragging = true
      this.draggedItem = item
      this.parentItem = parent

      event.dataTransfer.setData('text/plain', item.id)
      event.dataTransfer.setData('parent-id', parent ? parent.id : '')
      event.dataTransfer.effectAllowed = 'move'

      event.target.classList.add('opacity-50')
    },

    // Drag Over Handler
    onDragOver(event) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'

      // Visual feedback for drag over
      this.dragOverElement = event.currentTarget
      event.currentTarget.classList.add('bg-blue-50', 'border-blue-200')
    },

    // Drop Handler for Lists
    onDrop(event, targetList) {
      event.preventDefault()
      this.resetDragState()

      if (!this.draggedItem || this.sourceList === targetList) return

      // Remove from source list
      if (this.sourceList === 'list1') {
        this.list1Items = this.list1Items.filter((item) => item.id !== this.draggedItem.id)
        this.list2Items.push(this.draggedItem)
      } else {
        this.list2Items = this.list2Items.filter((item) => item.id !== this.draggedItem.id)
        this.list1Items.push(this.draggedItem)
      }
    },

    // Hierarchical Drop Handler
    onHierarchicalDrop(event) {
      event.preventDefault()
      this.resetDragState()

      if (!this.draggedItem) return

      // Remove from previous location
      this.removeItemFromHierarchy(this.draggedItem)

      // Add to root level
      this.hierarchicalItems.push(this.draggedItem)
    },

    // Sub-list Drop Handler
    onSubListDrop(event, parentItem) {
      event.preventDefault()
      this.resetDragState()

      if (!this.draggedItem || !parentItem.draggable) return

      // Remove from previous location
      this.removeItemFromHierarchy(this.draggedItem)

      // Add to sub-list
      if (!parentItem.children) {
        parentItem.children = []
      }
      parentItem.children.push(this.draggedItem)
    },

    // Drag End Handler
    onDragEnd(event) {
      this.resetDragState()
      event.target.classList.remove('opacity-50')
    },

    // Remove item from hierarchy
    removeItemFromHierarchy(item) {
      // Remove from lists
      this.list1Items = this.list1Items.filter((i) => i.id !== item.id)
      this.list2Items = this.list2Items.filter((i) => i.id !== item.id)

      // Remove from hierarchical items
      this.hierarchicalItems = this.hierarchicalItems.filter((i) => i.id !== item.id)

      // Remove from sub-lists
      this.hierarchicalItems.forEach((parent) => {
        if (parent.children) {
          parent.children = parent.children.filter((child) => child.id !== item.id)
        }
      })
    },

    // Reset drag state
    resetDragState() {
      this.isDragging = false
      this.draggedItem = null
      this.sourceList = null
      this.parentItem = null

      if (this.dragOverElement) {
        this.dragOverElement.classList.remove('bg-blue-50', 'border-blue-200')
        this.dragOverElement = null
      }
    },

    // Get CSS classes for items
    getItemClasses(item) {
      return {
        'bg-blue-100 border-blue-300': this.isDragging && this.draggedItem?.id === item.id,
        'bg-gray-100 border-gray-300 cursor-not-allowed': !item.draggable,
        'bg-white border-gray-200 cursor-move hover:bg-gray-50': item.draggable,
        'border-green-300 bg-green-50':
          this.dragOverElement && this.dragOverElement.contains(event?.target),
      }
    },

    // Get CSS classes for hierarchical items
    getHierarchicalItemClasses(item) {
      return {
        'bg-blue-100 border-blue-300': this.isDragging && this.draggedItem?.id === item.id,
        'bg-gray-100 border-gray-300 cursor-not-allowed': !item.draggable,
        'bg-white border-gray-200 cursor-move hover:bg-gray-50': item.draggable,
        'border-green-300 bg-green-50':
          this.dragOverElement && this.dragOverElement.contains(event?.target),
      }
    },
  },
}
</script>

<style scoped>
.sortable-list {
  transition: background-color 0.2s ease;
}

.sortable-item {
  transition: all 0.2s ease;
}

.hierarchical-item {
  transition: all 0.2s ease;
}

.parent-item {
  cursor: move;
}

.child-item {
  cursor: move;
}

/* Drag preview styling */
.drag-preview {
  opacity: 0.8;
  transform: rotate(5deg);
}

/* Drop zone styling */
.drop-zone {
  border: 2px dashed #3b82f6;
  background-color: #eff6ff;
}
</style>
