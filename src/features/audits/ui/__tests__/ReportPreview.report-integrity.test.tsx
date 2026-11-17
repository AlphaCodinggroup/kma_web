import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditFinding } from "@entities/audit/model/audit-review";
import { mapAuditFindingDTO } from "@entities/audit/lib/audit-review.mappers";

const updateFinding = vi.fn();
vi.mock("@features/audits/lib/usecases/updateAuditFinding", () => ({updateAuditFinding:(...args:unknown[])=>updateFinding(...args)}));
vi.mock("@features/audits/api/audit-review.repo.impl", () => ({auditReviewDetailRepo:{}}));

import {useReportDrafts} from "../../lib/hooks/useReportDrafts";
import ReportPreview from "../ReportPreview";

function setup(finding: AuditFinding, editable = true) {
  const client = new QueryClient();
  vi.spyOn(client, "invalidateQueries").mockResolvedValue(undefined);
  function Preview() {
    const drafts = useReportDrafts("audit-1", [finding]);
    return <><ReportPreview findings={[finding]} facilityName="Facility" editable={editable} drafts={drafts} canComment={false} onAddComment={()=>{}}/>
      <button onClick={()=>void drafts.save()} disabled={drafts.hasErrors || !drafts.isDirty}>Save report</button></>;
  }
  render(<QueryClientProvider client={client}><Preview/></QueryClientProvider>);
}

beforeEach(()=>{vi.clearAllMocks();updateFinding.mockResolvedValue({});});

describe("report integrity", ()=>{
  it("selects individual photos and saves their stored references", async()=>{
    const user = userEvent.setup();
    setup(mapAuditFindingDTO({question_code:"B1",answer:"NO",photos:["one-temp.jpg","two-temp.jpg"],photo_details:[
      {url:"one-temp.jpg",reference:"evidence/one.jpg",include_in_report:true},
      {url:"two-temp.jpg",reference:"evidence/two.jpg",include_in_report:false},
    ]} as never));
    const second = screen.getByRole("checkbox", {name:"Include photo 2 of finding 1 in report"});
    expect(second).not.toBeChecked();
    await user.click(second);
    await user.click(screen.getByRole("button",{name:"Save report"}));
    expect(updateFinding).toHaveBeenCalledWith({auditId:"audit-1",questionCode:"B1",photos:[
      {url:"evidence/one.jpg",includeInReport:true},{url:"evidence/two.jpg",includeInReport:true},
    ]});
  });

  it("prints zero beside its source barrier and uses global measurement labels", ()=>{
    setup(mapAuditFindingDTO({question_code:"B1, B2",answer:"NO",barrier_statement:"First barrier\nSecond barrier",
      barrier_details:[{question_code:"B1",barrier_statement:"First barrier"},{question_code:"B2",barrier_statement:"Second barrier"}],
      measurements:[{name:"width",value:0,unit:'"',source_question_code:"B1"},{name:"width",value:3,unit:"%",source_question_code:"B2"}],
    } as never), false);
    expect(within(screen.getByRole("group",{name:"Barrier B1"})).getByText('Measurement: 0"')).toBeInTheDocument();
    expect(within(screen.getByRole("group",{name:"Barrier B2"})).getByText("Measurement 1: 3%")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("keeps an absent legacy measurement when editing another slot", async()=>{
    const user = userEvent.setup();
    setup(mapAuditFindingDTO({question_code:"B1",answer:"NO",measurements:[{name:"width",value:null,unit:"in"},{name:"slope",value:3,unit:"%"}]}));
    expect(screen.getByRole("spinbutton",{name:"Measurement of finding 1"})).toHaveValue(null);
    fireEvent.change(screen.getByRole("spinbutton",{name:"Measurement 1 of finding 1"}),{target:{value:"4"}});
    await user.click(screen.getByRole("button",{name:"Save report"}));
    expect(updateFinding).toHaveBeenCalledWith({auditId:"audit-1",questionCode:"B1",measurements:[{name:"width",value:null},{name:"slope",value:4}]});
  });

  it("blocks saving more than three selected photos", async()=>{
    const user = userEvent.setup();
    setup(mapAuditFindingDTO({question_code:"B1",answer:"NO",photo_details:Array.from({length:4},(_,index)=>({url:`image-${index}.jpg`,reference:`evidence/${index}.jpg`,include_in_report:false}))}));
    for (const checkbox of screen.getAllByRole("checkbox")) await user.click(checkbox);
    expect(screen.getByRole("alert")).toHaveTextContent("Choose up to 3 photos for the report");
    expect(screen.getByRole("button",{name:"Save report"})).toBeDisabled();
    expect(updateFinding).not.toHaveBeenCalled();
  });

  it("keeps photo choices after a failed save and allows excluding every photo", async()=>{
    const user = userEvent.setup();
    updateFinding.mockRejectedValue({message:"Save failed"});
    setup(mapAuditFindingDTO({question_code:"B1",answer:"NO",photo_details:[{url:"image.jpg",reference:"evidence/image.jpg",include_in_report:true}]}));
    const checkbox = screen.getByRole("checkbox",{name:"Include photo 1 of finding 1 in report"});
    await user.click(checkbox);
    await user.click(screen.getByRole("button",{name:"Save report"}));
    expect(checkbox).not.toBeChecked();
    expect(updateFinding).toHaveBeenCalledWith({auditId:"audit-1",questionCode:"B1",photos:[{url:"evidence/image.jpg",includeInReport:false}]});
  });
});
