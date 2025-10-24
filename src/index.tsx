import { call } from "@decky/api";
import {
    ButtonItem,
    definePlugin,
    PanelSection,
    PanelSectionRow,
    staticClasses,
    Dropdown,
    DropdownOption,
    SingleDropdownOption,
    Button,
} from "@decky/ui";

import { VFC, useState, useEffect } from "react";
import { MdWbShade } from "react-icons/md";

const Content: VFC<{}> = ({}) => {
    const baseShader = { data: "None", label: "No Shader" } as SingleDropdownOption;
    const [_shaderList, setShaderList] = useState<string[]>([]);
    const [selectedShader, setSelectedShader] = useState<DropdownOption>(baseShader);
    const [shaderOptions, setShaderOptions] = useState<DropdownOption[]>([baseShader]);

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

        setShaderList(shaderList);
        setShaderOptions(getShaderOptions(shaderList, baseShader));

        let currShader = await call<any, string>("get_current_shader");
        console.log("Current Shader: " + currShader);
        setSelectedShader({
            data: currShader,
            label: currShader == "0" ? "No Shader" : currShader,
        } as SingleDropdownOption);
    };

    useEffect(() => {
        initState();
    }, []);

    return (
        <PanelSection title="Select Shader">
            <PanelSectionRow>
                <Dropdown
                    menuLabel="Select Shader"
                    strDefaultLabel={selectedShader.label as string}
                    rgOptions={shaderOptions}
                    selectedOption={selectedShader}
                    onChange={(newSelectedShader: DropdownOption) => {
                        setSelectedShader(newSelectedShader);
                    }}
                />
            </PanelSectionRow>
            <PanelSectionRow>
                <Button
                    style={{ padding: "8px 16px" }}
                    onClick={async () => {
                        console.log("Selected Shader is: " + selectedShader);
                        await call("apply_shader", selectedShader.data);
                    }}
                >
                    Enable shader
                </Button>
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
    return {
        title: <div className={staticClasses.Title}>Reshadeck</div>,
        content: <Content />,
        icon: <MdWbShade />,
        alwaysRender: true,
    };
});
