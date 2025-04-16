<script setup>
import { onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useRequirementStore } from "@/stores/useRequirementStore";
import TextEditor from "@/components/TextEditor.vue";

const store = useRequirementStore();
const route = useRoute();
const router = useRouter();

const requirementId = route.params.id;
const description = ref("");
const loading = ref(false);

onMounted(async () => {
  await store.fetchRequirement(requirementId);
  description.value = store.requirement.description[0] || "";
});

watch(
  () => store.requirement,
  (newRequirement) => {
    description.value = newRequirement.description[0] || "";
  }
);

const update = async () => {
  loading.value = true;
  await store.updateRequirement(requirementId, {
    title: store.requirement.title,
    department_id: store.requirement.department_id,
    description: [description.value],
  });
  loading.value = false;

  if (!store.error) {
    router.push({ name: "RequirementList" });
  }
};
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="max-w-xl mx-auto bg-white shadow-lg rounded-lg p-6">
      <h2 class="text-2xl font-semibold text-gray-800 mb-4">
        Edit Requirement
      </h2>

      <div v-if="store.loading" class="text-center py-4 text-gray-500">
        Loading requirement details...
      </div>

      <form v-else-if="store.requirement" @submit.prevent="update">
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">
            Requirement Title
          </label>
          <input
            v-model="store.requirement.title"
            type="text"
            required
            placeholder="Enter requirement title"
            class="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">
            Department ID
          </label>
          <input
            v-model="store.requirement.department_id"
            type="number"
            required
            placeholder="Enter department ID"
            class="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">
            Description
          </label>
          <TextEditor
            v-model="description"
            placeholder="Update requirement description"
            class="border rounded-md"
          />
        </div>

        <div v-if="store.error" class="mb-4 text-red-500 font-medium">
          {{ store.error }}
        </div>

        <div class="flex items-center gap-4">
          <button
            :disabled="loading"
            type="submit"
            class="bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2 rounded transition"
          >
            {{ loading ? "Updating..." : "Update Requirement" }}
          </button>

          <button
            type="button"
            @click="router.push({ name: 'RequirementList' })"
            class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded transition"
          >
            Cancel
          </button>
        </div>
      </form>

      <div v-else class="text-center py-4 text-red-500">
        {{ store.error || "Requirement not found." }}
      </div>
    </div>
  </div>
</template>
