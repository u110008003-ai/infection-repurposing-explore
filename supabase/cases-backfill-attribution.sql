update public.cases
set
  created_by = coalesce(public.cases.created_by, public.proposals.user_id),
  promoted_by = coalesce(public.cases.promoted_by, public.proposals.reviewed_by)
from public.proposals
where public.proposals.promoted_case_id = public.cases.id
  and (
    public.cases.created_by is null
    or public.cases.promoted_by is null
  );
