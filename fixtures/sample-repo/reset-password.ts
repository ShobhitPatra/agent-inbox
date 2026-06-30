import type { Request, Response } from "express";

export const resetPasswordHandler = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  const payload = jwt.verify(token, process.env.JWT_SECRET!);
  const user = await db.users.findOne({ id: (payload as any).userId });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await db.users.update({ id: user.id }, { password: hash });
  return res.status(200).json({ ok: true });
};
