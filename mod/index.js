function SampleMod(api) {

    function ModImplementation(root) {
        [mb_init]
        if (root.matchmode.getIsMultiplayer()) return; // disable the mod in multiplayer

        root.signals.postLoadHook.add(() => {
            // All Component info is available now, you can access
            // proper Structure components values.
        });
    }

    api.registerModImplementation(ModImplementation);

}


registerMod(SampleMod);