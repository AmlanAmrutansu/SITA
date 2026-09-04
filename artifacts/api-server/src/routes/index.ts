import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dataRouter from "./sita-data";
import chatRouter from "./chat";
import medicalRecordsRouter from "./medical-records";
import recommendationsRouter from "./recommendations";

const router: IRouter = Router();

router.post("/debug-error", (req, res) => {
  console.log('--- FRONTEND ERROR REPORT ---');
  console.log(req.body);
  console.log('-----------------------------');
  res.json({ ok: true });
});

router.use(healthRouter);
router.use(authRouter);
router.use(dataRouter);
router.use(chatRouter);
router.use(medicalRecordsRouter);
router.use(recommendationsRouter);

export default router;
