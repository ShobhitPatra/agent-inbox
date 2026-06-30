import type { Request, Response } from "express";

export const loginHandler = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await db.users.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!);
  return res.json({ token });
};
