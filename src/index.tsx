import { call, toaster, Toaster } from "@decky/api";
import {
    ButtonItem,
    definePlugin,
    PanelSection,
    PanelSectionRow,
    staticClasses,
    Dropdown,
    DropdownOption,
    SingleDropdownOption,
    Unregisterable,
} from "@decky/ui";

import { VFC, useState, useEffect } from "react";
import { MdWbShade } from "react-icons/md";

class ReshadeckLogic {
    dataTakenAt: number = Date.now();
    screensaverActive: boolean = false;

    handleButtonInput = async (val: any[]) => {
        if (!this.screensaverActive) {
            return;
        }
        let cancel = false;
        const {
            flSoftwareGyroDegreesPerSecondPitch,
            flSoftwareGyroDegreesPerSecondYaw,
            flSoftwareGyroDegreesPerSecondRoll,
            ulButtons,
            sLeftStickX,
            sLeftStickY,
            sRightStickX,
            sRightStickY,
        } = val[0];

        if (ulButtons != 0) {
            cancel = true;
        }
        if (
            Math.abs(sLeftStickX) > 5000 ||
            Math.abs(sLeftStickY) > 5000 ||
            Math.abs(sRightStickX) > 5000 ||
            Math.abs(sRightStickY) > 5000
        ) {
            cancel = true;
        }

        if (!cancel && Date.now() - this.dataTakenAt < 1000) {
            return;
        }
        this.dataTakenAt = Date.now();
        let degrees = 10;
        if (
            (!cancel && Math.abs(flSoftwareGyroDegreesPerSecondPitch) > degrees) ||
            Math.abs(flSoftwareGyroDegreesPerSecondYaw) > degrees ||
            Math.abs(flSoftwareGyroDegreesPerSecondRoll) > degrees
        ) {
            cancel = true;
        }

        if (cancel) {
            await call("apply_shader", { screensaver: false });

            toaster.toast({
                title: "Waking Up Screen",
                body: "Waking Up Screen",
                duration: 100,
                critical: true,
            });

            this.screensaverActive = false;
        }
    };

    handleSuspend = async () => {
        await call("apply_shader", { screensaver: false });
    };
}

const Content: VFC<{ logic: ReshadeckLogic }> = ({ logic }) => {
    const baseShader = { data: "None", label: "No Shader" } as SingleDropdownOption;
    const baseScreensaver = { data: "None", label: "No Screensaver" } as SingleDropdownOption;
    const [_shaderList, setShaderList] = useState<string[]>([]);
    const [selectedShader, setSelectedShader] = useState<DropdownOption>(baseShader);
    const [shaderOptions, setShaderOptions] = useState<DropdownOption[]>([baseShader]);
    const [selectedScreenSaver, setSelectedScreenSaver] = useState<DropdownOption>(baseShader);
    const [screenSaverOptions, setScreenSaverOptions] = useState<DropdownOption[]>([baseScreensaver]);

    const getShaderOptions = (leList: string[], baseShaderOrSS: any) => {
        let options: DropdownOption[] = [];
        options.push(baseShaderOrSS);
        for (let i = 0; i < leList.length; i++) {
            let option = { data: leList[i], label: leList[i] } as SingleDropdownOption;
            options.push(option);
        }
        return options;
    };

    const initState = async () => {
        let shaderList = await call<any, string[]>("get_shader_list");
        let screensaverList = await call<any, string[]>("get_screensaver_list");

        setShaderList(shaderList);
        setShaderOptions(getShaderOptions(shaderList, baseShader));
        setScreenSaverOptions(getShaderOptions(screensaverList, baseScreensaver));

        let curr = await call<any, string>("get_current_shader");
        setSelectedShader({
            data: curr,
            label: curr == "0" ? "None" : curr,
        } as SingleDropdownOption);

        let currSS = await call<any, string>("get_current_screensaver");
        setSelectedScreenSaver({
            data: currSS,
            label: currSS == "0" ? "None" : currSS,
        } as SingleDropdownOption);
    };

    useEffect(() => {
        initState();
    }, []);

    return (
        <PanelSection title="Select Shader">
            <PanelSectionRow>
                <Dropdown
                    menuLabel="Select shader"
                    strDefaultLabel={selectedShader.label as string}
                    rgOptions={shaderOptions}
                    selectedOption={selectedShader}
                    onChange={async (newSelectedShader: DropdownOption) => {
                        await call("set_shader", {
                            shader_name: newSelectedShader.data,
                        });
                    }}
                />
            </PanelSectionRow>
            <PanelSectionRow>
                <b>Select Screensaver</b>
            </PanelSectionRow>
            <PanelSectionRow>
                <Dropdown
                    menuLabel="Select screensaver"
                    strDefaultLabel={selectedScreenSaver.label as string}
                    rgOptions={screenSaverOptions}
                    selectedOption={selectedScreenSaver}
                    onChange={async (newSelectedScreenSaver: DropdownOption) => {
                        await call("set_screensaver", {
                            shader_name: newSelectedScreenSaver.data,
                        });
                        setSelectedScreenSaver(newSelectedScreenSaver.data);
                    }}
                />
            </PanelSectionRow>
            <PanelSectionRow>
                <ButtonItem
                    onClick={async () => {
                        console.log(selectedScreenSaver);
                        await call("apply_shader", { screensaver: true });

                        toaster.toast({
                            title: "Starting Screensaver",
                            body: "Starting Screensaver",
                            duration: 100,
                            critical: true,
                        });
                        setTimeout(() => {
                            (logic as any).screensaverActive = true;
                        }, 5000);
                    }}
                >
                    Start Screensaver
                </ButtonItem>
            </PanelSectionRow>
            <PanelSectionRow>
                <div>
                    Place any custom shaders in <pre>~/.local/share/gamescope</pre>
                    <pre>/reshade/Shaders</pre> so that the .fx files are in the root of the Shaders folder.
                </div>
            </PanelSectionRow>
            <PanelSectionRow>
                <div>WARNING: Shaders can lead to dropped frames and possibly even severe performance problems.</div>
            </PanelSectionRow>
        </PanelSection>
    );
};

export default definePlugin(() => {
    const SteamClient = window.SteamClient;

    let logic = new ReshadeckLogic();

    let inputRegister: Unregisterable;
    if (SteamClient.Input.RegisterForControllerStateChanges) {
        inputRegister = SteamClient.Input.RegisterForControllerStateChanges(logic.handleButtonInput);
    }

    let suspendRegisters: Unregisterable[] = [];
    if (SteamClient.System.RegisterForOnSuspendRequest) {
        suspendRegisters.push(SteamClient.System.RegisterForOnSuspendRequest(logic.handleSuspend));
    }
    if (SteamClient.System.RegisterForOnResumeFromSuspend) {
        suspendRegisters.push(SteamClient.System.RegisterForOnResumeFromSuspend(logic.handleSuspend));
    }

    return {
        title: <div className={staticClasses.Title}>Reshadeck</div>,
        content: <Content logic={logic} />,
        icon: <MdWbShade />,

        onDismount() {
            inputRegister?.unregister();

            suspendRegisters.forEach((suspend_register) => {
                suspend_register.unregister();
            });
        },
        alwaysRender: true,
    };
});
