import { ref, computed } from 'vue';
import { useAuth } from './useAuth';
import { useApiClient } from './useApi';

export interface TemplateSectionInfo {
  key: string;
  module: string;
  label: string;
  icon?: string;
  path?: string;
  description?: string;
  order?: number;
}

export interface ActiveSiteTemplateInfo {
  siteId: string;
  schoolId: string;
  templateId: string;
  templateVersionId: string;
  templateKey: string;
  templateName: string;
  category: string;
  version: string;
  manifest: Record<string, any>;
  sections: TemplateSectionInfo[];
  supportedModules: string[];
  themeFields: Array<{
    key: string;
    label: string;
    type: string;
    defaultValue?: string;
  }>;
}

const templateState = ref<ActiveSiteTemplateInfo | null>(null);
const isLoadingTemplate = ref(false);

export function useSiteTemplate() {
  const { user } = useAuth();

  async function fetchActiveTemplate(force = false) {
    if (!force && templateState.value) return templateState.value;
    if (!user.value?.school?.id) return null;

    isLoadingTemplate.value = true;
    try {
      const obRes = await useApiClient(`/schools/${user.value.school.id}/onboarding`);
      if (obRes.success && obRes.data?.siteId) {
        const siteId = obRes.data.siteId;
        const res = await useApiClient(`/sites/${siteId}/template`);
        if (res.success && res.data) {
          templateState.value = res.data;
        }
      }
    } catch (err) {
      console.warn('Failed to load active template info:', err);
    } finally {
      isLoadingTemplate.value = false;
    }

    return templateState.value;
  }

  const supportedModules = computed(() => {
    return templateState.value?.supportedModules || [
      'site_settings',
      'hero_slides',
      'programs',
      'facilities',
      'news',
      'vision_mission',
      'statistics',
      'staff',
      'student_organizations',
      'testimonials',
      'ppdb',
      'video_profile',
      'contact',
      'navigation',
      'media'
    ];
  });

  function supportsModule(moduleKey: string) {
    return supportedModules.value.includes(moduleKey);
  }

  return {
    template: templateState,
    isLoading: isLoadingTemplate,
    fetchActiveTemplate,
    supportedModules,
    supportsModule
  };
}
