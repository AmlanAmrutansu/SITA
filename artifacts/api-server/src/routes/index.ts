import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dataRouter from "./sita-data";
import chatRouter from "./chat";

const router: IRouter = Router();

router.post("/debug-error", (req, res) => {
  require('fs').appendFileSync('frontend-errors.log', JSON.stringify(req.body) + '\n');
  console.log('--- FRONTEND ERROR REPORT ---');
  console.log(req.body);
  console.log('-----------------------------');
  res.json({ ok: true });
});

router.use(healthRouter);
router.use(authRouter);
router.use(dataRouter);
router.use(chatRouter);

export default router;
