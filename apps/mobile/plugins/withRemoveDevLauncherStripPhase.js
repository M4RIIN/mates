const { withXcodeProject } = require("expo/config-plugins");

const BUILD_PHASE_NAME =
  "[Expo Dev Launcher] Strip Local Network Keys for Release";

function removeBuildPhaseFromTarget(project, targetUuid, buildPhaseName) {
  const nativeTarget = project.pbxNativeTargetSection()[targetUuid];
  if (!nativeTarget?.buildPhases) {
    return false;
  }

  const shellScriptPhases = project.hash.project.objects.PBXShellScriptBuildPhase;
  if (!shellScriptPhases) {
    return false;
  }

  const buildPhaseIndex = nativeTarget.buildPhases.findIndex(
    (phase) => phase.comment === buildPhaseName
  );

  if (buildPhaseIndex === -1) {
    return false;
  }

  const [buildPhaseRef] = nativeTarget.buildPhases.splice(buildPhaseIndex, 1);
  if (buildPhaseRef?.value) {
    delete shellScriptPhases[buildPhaseRef.value];
    delete shellScriptPhases[`${buildPhaseRef.value}_comment`];
  }

  return true;
}

module.exports = function withRemoveDevLauncherStripPhase(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const projectName = config.modRequest.projectName;
    const targetUuid = project.findTargetKey(projectName ?? "");

    if (!targetUuid) {
      return config;
    }

    removeBuildPhaseFromTarget(project, targetUuid, BUILD_PHASE_NAME);
    return config;
  });
};
