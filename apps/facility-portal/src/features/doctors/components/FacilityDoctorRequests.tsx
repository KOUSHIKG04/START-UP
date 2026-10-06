"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { decideMyFacilityDoctorRequest, listMyFacilityDoctorRequests } from "@startup/data-access";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Button } from "@startup/web-ui/components/ui/button";
import { Input } from "@startup/web-ui/components/ui/input";
import { toast } from "@startup/web-ui/components/ui/toast";

export function FacilityDoctorRequests({ onChange }: { onChange?: () => void }) {
  const queryClient = useQueryClient();
  const [reasons,setReasons] = useState<Record<string,string>>({});
  const requests = useQuery({queryKey:["facility-doctor-requests"],queryFn:()=>listMyFacilityDoctorRequests(createBrowserSupabaseClient()),refetchInterval:30000});
  useEffect(() => {
    if (requests.isError) toast.add({ title: "Could not load doctor requests", description: "Refresh and try again.", type: "error" });
  }, [requests.isError]);
  const decide = useMutation({
    mutationFn:({id,approve}:{id:string;approve:boolean}) => decideMyFacilityDoctorRequest(createBrowserSupabaseClient(),id,approve,reasons[id]),
    onSuccess:async()=>{toast.add({title:"Doctor request updated",type:"success"}); await queryClient.invalidateQueries({queryKey:["facility-doctor-requests"]});onChange?.();},
    onError:(error)=>toast.add({title:"Could not update doctor request",description:error.message,type:"error"}),
  });
  const pending = requests.data?.filter(item=>item.status==="pending" && item.initiated_by==="doctor") ?? [];
  const invited = requests.data?.filter(item=>item.status==="pending" && item.initiated_by==="facility") ?? [];
  return <section className="rounded-[16px] border border-[#e2e8f0] bg-white p-6 shadow-xs"><h2 className="text-[18px] font-bold text-[#0f172a]">Doctor association requests</h2><p className="mt-1 text-[13px] text-[#475569]">Accept a doctor for your hospital or clinic. They can practise here only after Clinzo verifies their credentials.</p>{requests.isLoading && <p className="mt-4 text-sm">Loading requests…</p>}{!requests.isLoading && !pending.length && !invited.length && <p className="mt-4 text-sm text-[#64748b]">No pending requests.</p>}<div className="mt-4 space-y-3">{pending.map(item=><div key={item.id} className="rounded-xl border border-[#e2e8f0] p-4"><p className="font-semibold text-[#0f172a]">{item.doctor_name} <span className="text-sm font-normal text-[#64748b]">{item.doctor_code}</span></p><p className="text-sm text-[#475569]">{item.facility_name} · Clinzo credentials: {item.credential_status}</p><div className="mt-3 flex flex-wrap items-center gap-2"><Button disabled={decide.isPending} onClick={()=>decide.mutate({id:item.id,approve:true})}>Accept</Button><Input aria-label={`Rejection reason for ${item.doctor_name}`} placeholder="Reason to decline" value={reasons[item.id] ?? ""} onChange={event=>setReasons({...reasons,[item.id]:event.target.value})} className="max-w-56" /><Button variant="outline" disabled={decide.isPending || (reasons[item.id]?.trim().length ?? 0)<5} onClick={()=>decide.mutate({id:item.id,approve:false})}>Decline</Button></div></div>)}{invited.map(item=><p key={item.id} className="text-sm text-[#475569]">Invitation sent to {item.doctor_name} for {item.facility_name}; awaiting doctor acceptance.</p>)}</div></section>;
}
