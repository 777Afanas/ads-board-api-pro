import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import createHttpError from "http-errors";
import prisma from "../../prisma/client.js";
import { generateTokens, verifyToken } from "../utils/tokens.js";
import type { LoginBody, RefreshBody, RegisterBody } from "../validators/auth.validator.js";

const SALT_ROUNDS = 10;

export const publicUserSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
} as const;

async function issueTokens(user: { id: number; username: string }) {
  const tokens = generateTokens(user);

  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    prisma.refreshToken.create({ data: { token: tokens.refreshToken, userId: user.id } }),
  ]);

  return tokens;
}

export async function register(req: Request, res: Response) {
  const { username, email, password, name } = req.body as RegisterBody;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });

  if (existing) {
    throw createHttpError(409, "Username or email already taken");
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { username, email, password: hashedPassword, name },
    select: publicUserSelect,
  });

  const tokens = await issueTokens(user);

  res.status(201).json({ user, ...tokens });
}

export async function login(req: Request, res: Response) {
  const { username, password } = req.body as LoginBody;

  const user = await prisma.user.findUnique({ where: { username } });
  
  if (!user) {
    throw createHttpError(401, "Invalid credentials");
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    throw createHttpError(401, "Invalid credentials");
  }

  const tokens = await issueTokens(user);
  const { password: _password, createdAt: _createdAt, ...publicUser } = user;

  res.json({ user: publicUser, ...tokens });
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body as RefreshBody;

  let userId: number;
  try {
    userId = Number(verifyToken(refreshToken, "refresh").sub);
  } catch {
    throw createHttpError(401, "Invalid refresh token");
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: { select: { id: true, username: true } } },
  });

  if (!stored) {
    throw createHttpError(401, "Invalid refresh token");
  }

  const tokens = generateTokens(stored.user);

  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  await prisma.refreshToken.create({ data: { token: tokens.refreshToken, userId } });

  res.json(tokens);
}

export async function logout(req: Request, res: Response) {
  await prisma.refreshToken.deleteMany({ where: { userId: req.user!.sub } });

  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { ...publicUserSelect, createdAt: true },
  });

  if (!user) {
    throw createHttpError(404, "User not found");
  }

  res.json(user);
}