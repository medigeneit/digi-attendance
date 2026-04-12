import OnboardingPreBoardingStage from '@/components/lifecycle/stages/OnboardingPreBoardingStage.vue'
import OnboardingTrainingStage from '@/components/lifecycle/stages/OnboardingTrainingStage.vue'
import OnboardingProbationStage from '@/components/lifecycle/stages/OnboardingProbationStage.vue'
import OnboardingConfirmationStage from '@/components/lifecycle/stages/OnboardingConfirmationStage.vue'
import OffboardingExitRequestStage from '@/components/lifecycle/stages/OffboardingExitRequestStage.vue'
import OffboardingHandoverStage from '@/components/lifecycle/stages/OffboardingHandoverStage.vue'
import OffboardingExitInterviewStage from '@/components/lifecycle/stages/OffboardingExitInterviewStage.vue'
import OffboardingSettlementStage from '@/components/lifecycle/stages/OffboardingSettlementStage.vue'

const stageRegistry = {
  onboarding: {
    pre_boarding: OnboardingPreBoardingStage,
    training: OnboardingTrainingStage,
    probation: OnboardingProbationStage,
    confirmation: OnboardingConfirmationStage,
  },
  offboarding: {
    exit_request: OffboardingExitRequestStage,
    handover_in_progress: OffboardingHandoverStage,
    exit_interview: OffboardingExitInterviewStage,
    settlement_pending: OffboardingSettlementStage,
  },
}

export function resolveLifecycleStageComponent(flowType, stageCode) {
  if (!flowType || !stageCode) return null
  return stageRegistry[flowType]?.[stageCode] || null
}
