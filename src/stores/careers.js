import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../axios";

export const useCareerStore = defineStore("careers", () => {
  // ===== State =====
  const items = ref([]);
  const meta = ref({ page: 1, per_page: 12, total: 0, last_page: 1 });
  const loading = ref(false);
  const error = ref(null);

  // Filters / query state (router query এর সাথে sync করব)
  const q = ref("");
  const status = ref("");
  const department_id = ref("");
  const employment_type = ref("");
  const workplace = ref("");
  const experience_level = ref("");
  const skills = ref([]); // [1,2,3]
  const only_open = ref(true);
  const sort = ref(""); // '', 'deadline_asc', 'salary_desc'
  const per_page = ref(12);
  const page = ref(1);

  const hasMore = computed(() => meta.value.page < meta.value.last_page);

  // ===== Actions =====
  async function fetchJobs(params = {}) {
    loading.value = true;
    error.value = null;

    try {
      const query = {
        q: q.value || undefined,
        status: status.value || undefined,
        department_id: department_id.value || undefined,
        employment_type: employment_type.value || undefined,
        workplace: workplace.value || undefined,
        experience_level: experience_level.value || undefined,
        skills: (skills.value && skills.value.length) ? skills.value.join(",") : undefined,
        only_open: only_open.value ? 1 : 0,
        sort: sort.value || undefined,
        per_page: per_page.value || 12,
        page: params.page ?? page.value ?? 1,
      };

      const { data } = await api.get("/careers/jobs", { params: query });

      // Laravel paginate response ধরে:
      items.value = data.data || [];
      meta.value = {
        page: data.current_page,
        last_page: data.last_page,
        per_page: data.per_page,
        total: data.total,
      };
      page.value = data.current_page;
    } catch (e) {
      error.value = e?.response?.data || e.message;
    } finally {
      loading.value = false;
    }
  }

  async function fetchJob(slug) {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await api.get(`/careers/jobs/${slug}`);
      return data; // { id, title, ... }
    } catch (e) {
      error.value = e?.response?.data || e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function applyToJob(jobId, payload) {
    const fd = new FormData();
    fd.append("full_name", payload.full_name);
    fd.append("email", payload.email);
    if (payload.phone) fd.append("phone", payload.phone);
    if (payload.cover_letter) fd.append("cover_letter", payload.cover_letter);
    if (payload.resume) fd.append("resume", payload.resume);
    if (payload.source) fd.append("source", payload.source);
    if (payload.answers) {
      fd.append("answers", JSON.stringify(payload.answers));
    }

    const { data } = await api.post(`/careers/jobs/${jobId}/apply`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  }

  function resetFilters() {
    q.value = "";
    status.value = "";
    department_id.value = "";
    employment_type.value = "";
    workplace.value = "";
    experience_level.value = "";
    skills.value = [];
    only_open.value = true;
    sort.value = "";
    per_page.value = 12;
    page.value = 1;
  }

  return {
    // state
    items, meta, loading, error,
    q, status, department_id, employment_type, workplace, experience_level, skills, only_open, sort, per_page, page,
    hasMore,

    // actions
    fetchJobs, fetchJob, applyToJob, resetFilters,
  };
});
