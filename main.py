import os
import shutil
import subprocess
from pathlib import Path

import decky

logger = decky.logger

destination_folder = decky.DECKY_USER_HOME + "/.local/share/gamescope/reshade/Shaders"
shaders_folder = decky.DECKY_PLUGIN_DIR + "/shaders"


class Plugin:
    _enabled = False
    _current = "0"

    def _get_clean_env(self):
        """Get environment with cleared LD_LIBRARY_PATH to fix decky-loader subprocess issues"""
        env = os.environ.copy()
        env["LD_LIBRARY_PATH"] = ""
        env["DISPLAY"] = ":0"
        return env

    async def get_shader_list(self):
        return sorted([str(p.name) for p in Path(destination_folder).glob("*.fx")])

    async def get_current_shader(self):
        return self._current

    async def apply_shader(self, shader_name):
        logger.info("Setting Shader: " + shader_name)
        self._current = shader_name

        try:
            ret = subprocess.run(
                [shaders_folder + "/set_shader.sh", shader_name],
                capture_output=True,
                env=self._get_clean_env(),
            )
            logger.info(ret)
        except Exception:
            logger.exception("apply shader")

    async def _main(self):
        try:
            Path(destination_folder).mkdir(parents=True, exist_ok=True)

            for item in Path(shaders_folder).glob("*.fx"):
                try:
                    shutil.copy(item, destination_folder)
                except Exception:
                    logger.debug(f"could not copy {item}")

            logger.info("Initialized")
            logger.info(str(await self.get_shader_list()))
        except Exception:
            logger.exception("main")
