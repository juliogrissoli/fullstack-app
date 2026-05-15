import { createClient } from '@/lib/supabase/server';
import OnboardingModal from '@/components/OnboardingModal';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const onboardingCompleted = user?.user_metadata?.onboarding_completed === true;

    return (
        <>
            {children}
            <OnboardingModal show={!onboardingCompleted} />
        </>
    );
}
