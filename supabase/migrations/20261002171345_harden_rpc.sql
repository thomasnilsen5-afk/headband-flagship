-- Advisor hardening: functions that RLS already covers run as the caller.
-- request_return stays SECURITY DEFINER on purpose: customers have no INSERT policy on
-- returns, so the function is the only door and it enforces ownership + the return window.

alter function public.current_app_role() security invoker;
alter function public.adjust_inventory(uuid, integer, text, text) security invoker;
