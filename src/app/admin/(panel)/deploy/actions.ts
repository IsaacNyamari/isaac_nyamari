"use server";

import { runAction } from "@/lib/action";
import { requireAdmin } from "@/lib/session";
import { readDeployStatus, startDeploy } from "@/server/services/deploy";

export async function startDeployAction() {
  return runAction(async () => {
    const admin = await requireAdmin("deploy:run");
    startDeploy(`${admin.name} (${admin.email})`);
    return null;
  }, "Deploy started");
}

/** Polled by the Deploy page while a deploy runs. */
export async function deployStatusAction() {
  return runAction(async () => {
    await requireAdmin("deploy:run");
    return readDeployStatus();
  });
}
