# based on https://github.com/oxalica/rust-overlay#use-in-devshell-for-nix-develop
{
  description = "A Nix-devShell to build/develop this project";

  inputs = {
    # `nixpkgs-unstable` is fully ok for an application (i.e., not a NixOS-system)
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

    # `rust-overlay` can give us a rust-version that is in-sync with rust-toolchain.toml
    rust-overlay.url = "github:oxalica/rust-overlay";

    # `flake-utils` for easier nix-system handling
    flake-utils.url = "github:numtide/flake-utils";

    # `flake-compat` for compatibility with non-flake Nix
    flake-compat = {
      url = "github:NixOS/flake-compat";
      flake = false;
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      rust-overlay,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        overlays = [
          (import rust-overlay)
        ];

        pkgs = import nixpkgs {
          inherit system overlays;
        };

        # use rust-version + components from the rust-toolchain.toml file
        rust-toolchain = pkgs.rust-bin.fromRustupToolchainFile ./rust-toolchain.toml;

        rustPlatform = pkgs.makeRustPlatform {
          cargo = rust-toolchain;
          rustc = rust-toolchain;
        };

        my-marker = pkgs.callPackage ./marker.nix { inherit rustPlatform; };
      in
      rec {
        packages.marker = my-marker;

        packages.default = packages.marker;

        devShells.marker = pkgs.mkShell {
          inputsFrom = [ packages.marker ];
        };

        devShells.default = devShells.marker;
      }
    );
}
