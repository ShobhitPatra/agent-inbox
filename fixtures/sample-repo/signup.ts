import type { Request, Response } from "express";

export const signupHandler = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  const existing = await db.users.findOne({ email });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await db.users.create({ email, password: hash, name });
  return res.status(201).json({ id: user.id, email: user.email });
};
