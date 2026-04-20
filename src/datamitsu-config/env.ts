interface Env {
  DATAMITSU_DEV_MODE: boolean;
}

export const env = (): Env => {
  const _env = facts().env;

  return {
    DATAMITSU_DEV_MODE: _env.DATAMITSU_DEV_MODE === "true",
  };
};
