import type { ElectrobunConfig } from "electrobun";

export default {
	app: {
		name: "blixt-wallet",
		identifier: "com.blixtwallet.electrobun",
		version: "0.9.0",
	},
	build: {
		views: {
			mainview: {
				entrypoint: "src/mainview/index.ts",
			},
		},
		copy: {
			"src/mainview/dist": "views/mainview/dist",
		},
		watch: ["../src", "../web", "../assets", "../locales", "../index.web.js", "../vite.config.ts"],
		watchIgnore: ["src/mainview/dist/**"],
		mac: {
			bundleCEF: false,
		},
		linux: {
			bundleCEF: false,
		},
		win: {
			bundleCEF: false,
		},
	},
} satisfies ElectrobunConfig;
