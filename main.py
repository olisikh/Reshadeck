import asyncio
import json
import os
import shutil
import subprocess
import sys
import time
import traceback
from pathlib import Path

import decky
from click import get_app_dir

logger = decky.logger

destination_folder = decky.DECKY_USER_HOME + "/.local/share/gamescope/reshade/Shaders"
shaders_folder = decky.DECKY_PLUGIN_DIR + "/shaders"


class Plugin:
    _enabled = False
    _current_shader = "0"
    _current_screensaver = "SS_ScreenOff.fx"

    def _get_clean_env(self):
        """Get environment with cleared LD_LIBRARY_PATH to fix decky-loader subprocess issues"""
        env = os.environ.copy()
        env["LD_LIBRARY_PATH"] = ""
        env["DISPLAY"] = ":0"
        return env

    def _get_all_shaders():
        return sorted([str(p.name) for p in Path(destination_folder).glob("*.fx")])

    async def get_shader_list(self):
        shaders = [s for s in Plugin._get_all_shaders() if not s.startswith("SS_")]
        return shaders

    async def get_screensaver_list(self):
        shaders = [s for s in Plugin._get_all_shaders() if s.startswith("SS_")]
        return shaders

    async def get_current_shader(self):
        return Plugin._current_shader

    async def get_current_screensaver(self):
        return Plugin._current_screensaver

    async def apply_shader(self, screensaver):
        shader_name = (
            Plugin._current_shader if not screensaver else Plugin._current_screensaver
        )
        logger.info("Applying shader: " + shader_name)

        try:
            ret = subprocess.run(
                [shaders_folder + "/set_shader.sh", shader_name],
                capture_output=True,
                env=self._get_clean_env(),
            )
            logger.info(ret)
        except Exception:
            logger.exception("apply shader")

    async def set_shader(self, shader_name):
        logger.info("Setting Shader: " + shader_name)
        Plugin._current_shader = shader_name

        await self.apply_shader(screensaver=False)

    async def set_screensaver(self, shader_name):
        logger.info("Setting Screensaver: " + shader_name)
        Plugin._current_screensaver = shader_name

    async def _main(self):
        try:
            Path(destination_folder).mkdir(parents=True, exist_ok=True)

            for item in Path(shaders_folder).glob("*.fx"):
                try:
                    shutil.copy(item, destination_folder)
                except Exception:
                    logger.debug(f"could not copy {item}")

            logger.info("Initialized")
            logger.info(str(await Plugin.get_shader_list(self)))

            await Plugin.apply_shader(self, False)
        except Exception:
            logger.exception("main")
