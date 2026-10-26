(() => {
  // ../ui-base/packages/ui-base-ui/ui.component.json
  var ui_component_default = {
    components: [
      {
        tagName: "uib-heading",
        module: "./src/content/uib-heading.js",
        importPath: "./heading",
        presentation: {
          settings: {
            size: {
              type: "select",
              options: [
                "compact",
                "default",
                "large"
              ],
              inheritable: true
            },
            align: {
              type: "select",
              options: [
                "start",
                "center",
                "end"
              ],
              inheritable: true
            }
          }
        }
      },
      {
        tagName: "uib-heading-block",
        module: "./src/content/uib-heading-block.js",
        importPath: "./heading-block",
        presentation: {
          settings: {
            size: {
              type: "select",
              options: [
                "compact",
                "default",
                "large"
              ],
              inheritable: true
            },
            align: {
              type: "select",
              options: [
                "start",
                "center",
                "end"
              ],
              inheritable: true
            }
          }
        }
      },
      {
        tagName: "uib-card",
        module: "./src/layout/uib-card.js",
        importPath: "./card",
        presentation: {
          settings: {
            variant: {
              type: "select",
              options: [
                "elevated",
                "outlined",
                "flat"
              ],
              inheritable: true
            },
            density: {
              type: "select",
              options: [
                "comfortable",
                "compact"
              ],
              inheritable: true
            }
          },
          parts: [
            "base",
            "media",
            "header",
            "body",
            "footer"
          ],
          cssVariables: [
            "--uib-color-ink",
            "--uib-font-family-sans",
            "--uib-color-border",
            "--uib-radius-lg",
            "--uib-color-surface",
            "--uib-color-surface-soft",
            "--uib-shadow-sm",
            "--uib-space-3",
            "--uib-space-4",
            "--uib-focus-ring",
            "--uib-color-primary"
          ]
        },
        schemaVersion: "1.0.0",
        identity: {
          componentId: "cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1",
          name: "card",
          displayName: "Card",
          description: "Repeatable content surface with optional link, action and selection behavior."
        },
        ownership: {
          scope: "platform",
          package: {
            packageId: "@ui-base/ui",
            scope: "platform",
            version: "0.5.1"
          },
          provenance: {
            origin: "installed-package",
            promotedFromComponentId: null,
            promotedFromRevisionId: null
          }
        },
        implementation: {
          type: "code",
          tagName: "uib-card",
          module: "./src/layout/uib-card.js",
          importPath: "@ui-base/ui/card",
          exportName: "UibCard",
          runtimeBinding: {
            kind: "custom-element",
            tagName: "uib-card"
          },
          aliases: [
            {
              importPath: "@ui-base/ui",
              exportName: "UibCard"
            },
            {
              importPath: "@ui-base/ui/layout",
              exportName: "UibCard"
            }
          ],
          registrationSideEffects: [
            "uib-stack",
            "uib-grid",
            "uib-row",
            "uib-column",
            "uib-panel",
            "uib-card",
            "uib-dialog",
            "uib-accordion",
            "uib-tab",
            "uib-tab-panel",
            "uib-tabs",
            "uib-splitter",
            "uib-icon"
          ]
        },
        version: {
          packageVersion: "0.5.1",
          runtimeCompatibility: "^0.5.1",
          revisionId: null
        },
        maturity: "experimental",
        category: "content-surfaces",
        runtime: {
          attributes: {
            name: {
              type: "string",
              default: "",
              observed: true,
              serialization: "string"
            },
            label: {
              type: "string",
              default: "",
              observed: true,
              serialization: "string"
            },
            help: {
              type: "string",
              default: "",
              observed: true,
              serialization: "string"
            },
            "help-mode": {
              type: "string",
              default: "tooltip",
              observed: true,
              serialization: "string"
            },
            title: {
              type: "string",
              default: "",
              observed: true,
              serialization: "string"
            },
            disabled: {
              type: "boolean",
              default: false,
              observed: true,
              serialization: "presence"
            },
            readonly: {
              type: "boolean",
              default: false,
              observed: true,
              serialization: "presence"
            },
            required: {
              type: "boolean",
              default: false,
              observed: true,
              serialization: "presence"
            },
            hidden: {
              type: "boolean",
              default: false,
              observed: true,
              serialization: "presence"
            },
            invalid: {
              type: "boolean",
              default: false,
              observed: true,
              serialization: "presence"
            },
            error: {
              type: "string",
              default: "",
              observed: true,
              serialization: "string"
            },
            "css-class": {
              type: "string",
              default: "",
              observed: true,
              serialization: "string"
            },
            "aria-label": {
              type: "string",
              default: "",
              observed: true,
              serialization: "string"
            },
            "aria-describedby": {
              type: "string",
              default: "",
              observed: true,
              serialization: "string"
            },
            heading: {
              type: "string",
              default: "",
              observed: true,
              serialization: "string"
            },
            variant: {
              type: "string",
              default: "elevated",
              observed: true,
              serialization: "string",
              enum: [
                "elevated",
                "outlined",
                "flat"
              ]
            },
            density: {
              type: "string",
              default: "comfortable",
              observed: true,
              serialization: "string",
              enum: [
                "comfortable",
                "compact"
              ]
            },
            href: {
              type: "string",
              default: "",
              observed: true,
              serialization: "string"
            },
            target: {
              type: "string",
              default: "",
              observed: true,
              serialization: "string"
            },
            rel: {
              type: "string",
              default: "",
              observed: true,
              serialization: "string"
            },
            action: {
              type: "string",
              default: "",
              observed: true,
              serialization: "string"
            },
            "action-token": {
              type: "string",
              default: "",
              observed: true,
              serialization: "string"
            },
            interactive: {
              type: "boolean",
              default: false,
              observed: true,
              serialization: "presence"
            },
            selectable: {
              type: "boolean",
              default: false,
              observed: true,
              serialization: "presence"
            },
            selected: {
              type: "boolean",
              default: false,
              observed: true,
              serialization: "presence"
            }
          },
          properties: {
            name: {
              type: "string",
              attribute: "name",
              writable: true,
              default: ""
            },
            label: {
              type: "string",
              attribute: "label",
              writable: true,
              default: ""
            },
            help: {
              type: "string",
              attribute: "help",
              writable: true,
              default: ""
            },
            helpMode: {
              type: "string",
              attribute: "help-mode",
              writable: true,
              default: "tooltip"
            },
            titleText: {
              type: "string",
              attribute: "title",
              writable: true,
              default: ""
            },
            disabled: {
              type: "boolean",
              attribute: "disabled",
              writable: true,
              default: false
            },
            readonly: {
              type: "boolean",
              attribute: "readonly",
              writable: true,
              default: false
            },
            required: {
              type: "boolean",
              attribute: "required",
              writable: true,
              default: false
            },
            hidden: {
              type: "boolean",
              attribute: "hidden",
              writable: true,
              default: false
            },
            invalid: {
              type: "boolean",
              attribute: "invalid",
              writable: true,
              default: false
            },
            error: {
              type: "string",
              attribute: "error",
              writable: true,
              default: ""
            },
            cssClass: {
              type: "string",
              attribute: "css-class",
              writable: true,
              default: ""
            },
            ariaLabel: {
              type: "string",
              attribute: "aria-label",
              writable: false,
              default: ""
            },
            ariaDescribedBy: {
              type: "string",
              attribute: "aria-describedby",
              writable: false,
              default: ""
            },
            heading: {
              type: "string",
              attribute: "heading",
              writable: false,
              default: "",
              fallback: "label"
            },
            variant: {
              type: "string",
              attribute: "variant",
              writable: false,
              default: "elevated",
              normalization: "lowercase-or-default"
            },
            density: {
              type: "string",
              attribute: "density",
              writable: false,
              default: "comfortable",
              normalization: "exact-compact-or-default"
            },
            href: {
              type: "string",
              attribute: "href",
              writable: false,
              default: ""
            },
            target: {
              type: "string",
              attribute: "target",
              writable: false,
              default: ""
            },
            rel: {
              type: "string",
              attribute: "rel",
              writable: false,
              default: ""
            },
            action: {
              type: "string",
              attribute: "action",
              writable: false,
              default: ""
            },
            actionToken: {
              type: "string",
              attribute: "action-token",
              writable: false,
              default: ""
            },
            interactive: {
              type: "boolean",
              attribute: "interactive",
              writable: false,
              default: false,
              computedFrom: [
                "interactive",
                "href",
                "action",
                "action-token",
                "selectable"
              ]
            },
            selectable: {
              type: "boolean",
              attribute: "selectable",
              writable: false,
              default: false
            },
            selected: {
              type: "boolean",
              attribute: "selected",
              writable: true,
              default: false,
              programmaticSetEmits: false
            },
            componentId: {
              type: "string",
              writable: false,
              role: "runtime-instance-id"
            }
          },
          events: {
            change: {
              detail: {
                name: "string",
                oldValue: "boolean",
                newValue: "boolean",
                selected: "boolean"
              },
              bubbles: true,
              composed: true,
              cancelable: false,
              selectionAliasOf: "uib-card-select",
              order: 1
            },
            "uib-card-select": {
              detail: {
                name: "string",
                oldValue: "boolean",
                newValue: "boolean",
                selected: "boolean"
              },
              bubbles: true,
              composed: true,
              cancelable: false,
              order: 2
            },
            "uib-card-action": {
              detail: {
                name: "string",
                action: "string",
                actionToken: "string",
                selected: "boolean"
              },
              bubbles: true,
              composed: true,
              cancelable: true,
              order: 3,
              cancellation: "prevent-original-event-default-after-selection"
            }
          },
          slots: [
            {
              name: "default",
              content: "text-or-elements"
            },
            {
              name: "media",
              content: "text-or-elements"
            },
            {
              name: "header",
              content: "text-or-elements"
            },
            {
              name: "footer",
              content: "text-or-elements"
            }
          ]
        },
        children: {
          runtime: "unrestricted-for-compatibility",
          builder: {
            content: [
              "text",
              "image"
            ],
            nestedInteractiveInLink: false
          }
        },
        builder: {
          groups: [
            {
              id: "content",
              label: "Content"
            },
            {
              id: "appearance",
              label: "Appearance"
            },
            {
              id: "interaction",
              label: "Interaction"
            },
            {
              id: "state",
              label: "State"
            },
            {
              id: "accessibility",
              label: "Accessibility"
            },
            {
              id: "events",
              label: "Event bindings"
            }
          ],
          definitionSettings: {
            displayName: {
              label: "Display name",
              type: "string",
              required: true,
              binding: {
                kind: "definition",
                path: "identity.displayName"
              }
            },
            description: {
              label: "Description",
              type: "string",
              editor: "textarea",
              binding: {
                kind: "definition",
                path: "identity.description"
              }
            }
          },
          settings: {
            heading: {
              label: "Heading",
              type: "string",
              group: "content",
              default: "",
              binding: {
                kind: "attribute",
                name: "heading"
              }
            },
            label: {
              label: "Fallback label",
              type: "string",
              group: "content",
              default: "",
              binding: {
                kind: "attribute",
                name: "label"
              }
            },
            body: {
              label: "Body",
              type: "string",
              group: "content",
              default: "Card body",
              binding: {
                kind: "slot",
                name: "default",
                content: "text"
              },
              editor: "textarea"
            },
            header: {
              label: "Header content",
              type: "string",
              group: "content",
              default: "",
              binding: {
                kind: "slot",
                name: "header",
                content: "text"
              }
            },
            footer: {
              label: "Footer",
              type: "string",
              group: "content",
              default: "",
              binding: {
                kind: "slot",
                name: "footer",
                content: "text"
              }
            },
            mediaSrc: {
              label: "Image URL",
              type: "string",
              group: "content",
              default: "",
              binding: {
                kind: "slot",
                name: "media",
                content: "image",
                altSetting: "mediaAlt"
              },
              format: "image-url"
            },
            mediaAlt: {
              label: "Image description",
              type: "string",
              group: "content",
              default: "",
              binding: {
                kind: "slotMetadata",
                slot: "media",
                name: "alt"
              }
            },
            variant: {
              label: "Variant",
              type: "string",
              group: "appearance",
              default: "elevated",
              binding: {
                kind: "attribute",
                name: "variant"
              },
              editor: "select",
              enum: [
                "elevated",
                "outlined",
                "flat"
              ]
            },
            density: {
              label: "Density",
              type: "string",
              group: "appearance",
              default: "comfortable",
              binding: {
                kind: "attribute",
                name: "density"
              },
              editor: "select",
              enum: [
                "comfortable",
                "compact"
              ]
            },
            cssClass: {
              label: "CSS classes",
              type: "string",
              group: "appearance",
              default: "",
              binding: {
                kind: "attribute",
                name: "css-class"
              }
            },
            interactionMode: {
              label: "Interaction mode",
              type: "string",
              group: "interaction",
              default: "none",
              binding: {
                kind: "mode"
              },
              editor: "select",
              enum: [
                "none",
                "link",
                "action",
                "selectable"
              ]
            },
            href: {
              label: "Link URL",
              type: "string",
              group: "interaction",
              default: "",
              binding: {
                kind: "attribute",
                name: "href"
              },
              format: "url",
              visibleWhen: {
                setting: "interactionMode",
                equals: "link"
              }
            },
            target: {
              label: "Link target",
              type: "string",
              group: "interaction",
              default: "",
              binding: {
                kind: "attribute",
                name: "target"
              },
              editor: "select",
              enum: [
                "",
                "_self",
                "_blank",
                "_parent",
                "_top"
              ],
              visibleWhen: {
                setting: "interactionMode",
                equals: "link"
              }
            },
            rel: {
              label: "Link relationship",
              type: "string",
              group: "interaction",
              default: "",
              binding: {
                kind: "attribute",
                name: "rel"
              },
              visibleWhen: {
                setting: "interactionMode",
                equals: "link"
              }
            },
            action: {
              label: "Action",
              type: "string",
              group: "interaction",
              default: "",
              binding: {
                kind: "attribute",
                name: "action"
              },
              visibleWhen: {
                setting: "interactionMode",
                equals: "action"
              }
            },
            actionToken: {
              label: "Action token",
              type: "string",
              group: "interaction",
              default: "",
              binding: {
                kind: "attribute",
                name: "action-token"
              },
              visibleWhen: {
                setting: "interactionMode",
                equals: "action"
              }
            },
            selected: {
              label: "Initially selected",
              type: "boolean",
              group: "state",
              default: false,
              binding: {
                kind: "attribute",
                name: "selected"
              },
              visibleWhen: {
                setting: "interactionMode",
                equals: "selectable"
              }
            },
            disabled: {
              label: "Disabled",
              type: "boolean",
              group: "state",
              default: false,
              binding: {
                kind: "attribute",
                name: "disabled"
              }
            },
            name: {
              label: "Event name",
              type: "string",
              group: "interaction",
              default: "",
              binding: {
                kind: "attribute",
                name: "name"
              }
            },
            ariaLabel: {
              label: "Accessible name",
              type: "string",
              group: "accessibility",
              default: "",
              binding: {
                kind: "attribute",
                name: "aria-label"
              }
            },
            ariaDescribedBy: {
              label: "Description IDs",
              type: "string",
              group: "accessibility",
              default: "",
              binding: {
                kind: "attribute",
                name: "aria-describedby"
              }
            },
            actionHandler: {
              label: "Action handler ID",
              type: "string",
              group: "events",
              default: "",
              binding: {
                kind: "event",
                name: "uib-card-action"
              },
              visibleWhen: {
                setting: "interactionMode",
                equals: "action"
              }
            },
            selectionHandler: {
              label: "Selection handler ID",
              type: "string",
              group: "events",
              default: "",
              binding: {
                kind: "event",
                name: "uib-card-select"
              },
              visibleWhen: {
                setting: "interactionMode",
                equals: "selectable"
              }
            }
          },
          interactionModes: {
            none: {
              attributes: {
                interactive: false,
                selectable: false
              }
            },
            link: {
              attributes: {
                interactive: false,
                selectable: false
              }
            },
            action: {
              attributes: {
                interactive: true,
                selectable: false
              }
            },
            selectable: {
              attributes: {
                interactive: false,
                selectable: true
              }
            }
          },
          validation: [
            {
              kind: "requiredWhen",
              setting: "href",
              when: {
                setting: "interactionMode",
                equals: "link"
              }
            },
            {
              kind: "oneOfRequiredWhen",
              settings: [
                "action",
                "actionToken"
              ],
              when: {
                setting: "interactionMode",
                equals: "action"
              }
            },
            {
              kind: "accessibleNameWhenInteractive",
              settings: [
                "heading",
                "label",
                "header",
                "ariaLabel"
              ]
            }
          ],
          responsive: {
            supported: false
          },
          preview: {
            renderer: "runtimeBinding",
            navigation: "prevent",
            eventHandlers: "observe-only"
          },
          eventBindings: {
            handlerReference: "registered-handler-id",
            cancellation: "synchronous-false-only",
            selectionEvent: "uib-card-select"
          }
        },
        capabilities: [
          "surface",
          "container",
          "interactive",
          "selectable",
          "linkable"
        ],
        dependencies: {
          packages: [
            {
              packageId: "@ui-base/core",
              range: "^0.1.0"
            },
            {
              packageId: "@ui-base/icons",
              range: "^0.1.0"
            }
          ],
          services: []
        },
        accessibility: {
          modes: [
            "section",
            "link",
            "button",
            "toggle-button"
          ],
          keyboard: {
            nonLink: [
              "Enter",
              "Space"
            ],
            link: "native"
          },
          namePrecedence: [
            "aria-label",
            "heading",
            "label",
            "header"
          ],
          disabled: "aria-disabled; remove-from-tab-order; block-activation"
        },
        lifecycle: {
          state: "installed",
          save: "workspace-only",
          publication: "unimplemented-stage-gate",
          publishedRevisionsImmutable: true,
          rollback: "new-revision",
          promotion: "new-identity-with-provenance"
        },
        clone: {
          workspace: "new-workspace-and-instance-ids;same-component-identity",
          component: "new-component-identity;retain-provenance"
        },
        deprecation: {
          status: "none",
          replacementComponentId: null
        },
        extensions: {}
      },
      {
        tagName: "uib-panel",
        module: "./src/layout/uib-panel.js",
        importPath: "./panel",
        presentation: {
          settings: {
            variant: {
              type: "select",
              options: [
                "elevated",
                "outlined",
                "flat"
              ],
              inheritable: true
            },
            density: {
              type: "select",
              options: [
                "comfortable",
                "compact"
              ],
              inheritable: true
            }
          }
        }
      },
      {
        tagName: "uib-instruction",
        module: "./src/content/uib-instruction.js",
        importPath: "./instruction",
        presentation: {
          settings: {
            density: {
              type: "select",
              options: [
                "comfortable",
                "compact"
              ],
              inheritable: true
            }
          }
        }
      },
      {
        tagName: "uib-action-group",
        module: "./src/actions/uib-action-group.js",
        importPath: "./action-group",
        presentation: {
          settings: {
            align: {
              type: "select",
              options: [
                "start",
                "center",
                "end"
              ],
              inheritable: true
            }
          }
        }
      }
    ]
  };

  // packages/visual-artifacts/src/source.ts
  var voidTags = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
  var optionalTags = new Set("p li dt dd rt rp option optgroup thead tbody tfoot tr td th".split(" "));
  var blockTags = new Set("address article aside blockquote div dl fieldset footer form h1 h2 h3 h4 h5 h6 header hr main nav ol p pre section table ul".split(" "));
  var escapeAttribute = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
  var decode = (value) => value.replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
  function parseSource(source2) {
    const nodes = [], stack = [], diagnostics = [];
    const implicitClose = (offset) => {
      const node = stack.pop();
      node.closeStart = offset;
      node.end = offset;
      node.manual = true;
      diagnostics.push({ severity: "warning", message: `Implicitly closed ${node.tag} is preserved as a manual region.`, node: node.id });
    };
    const token = /<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][\w:-]*(?:\s+(?:[^>"']|"[^"]*"|'[^']*')*)?\s*\/?>|(<\/?[A-Za-z][\w:-]*[^<>]*(?:>|(?=<)|$)|<(?:\s+\/?[A-Za-z]|\/\s+[A-Za-z]|[0-9])[^<>]*\bdata-uip-(?:node|component)\b[^<>]*(?:>|(?=<)|$)|<!--[\s\S]*$|<![^>]*$|<\?[^>]*(?:>|$))/gi;
    let match;
    while (match = token.exec(source2)) {
      const raw = match[0];
      if (match[1]) {
        diagnostics.push({ severity: "error", message: `Malformed opening tag at offset ${match.index}.` });
        continue;
      }
      if (raw.startsWith("<!")) continue;
      const tag = /^<\/?([\w:-]+)/.exec(raw)[1].toLowerCase();
      if (raw.startsWith("</")) {
        if (!/^<\/[\w:-]+\s*>$/.test(raw)) diagnostics.push({ severity: "error", message: `Malformed closing tag at offset ${match.index}.` });
        while (stack.length && stack.at(-1).tag !== tag && optionalTags.has(stack.at(-1).tag)) implicitClose(match.index);
        const node2 = stack.at(-1);
        if (!node2 || node2.tag !== tag) {
          diagnostics.push({ severity: "error", message: `Unmatched closing tag ${tag}. Visual editing requires explicit balanced markup.` });
          continue;
        }
        node2.closeStart = match.index;
        node2.end = token.lastIndex;
        stack.pop();
        continue;
      }
      while (stack.length) {
        const top = stack.at(-1).tag;
        const closes = top === "p" && blockTags.has(tag) || ["li", "option", "optgroup", "tr", "thead", "tbody", "tfoot"].includes(top) && top === tag || ["dt", "dd"].includes(top) && ["dt", "dd"].includes(tag) || ["td", "th"].includes(top) && ["td", "th"].includes(tag);
        if (!closes) break;
        implicitClose(match.index);
      }
      const attributes = {};
      const selfClosing = raw.endsWith("/>");
      const attrs = raw.slice(tag.length + 1, selfClosing ? -2 : -1);
      const attribute2 = /\s+([^\s=/'"><`&]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/y;
      const identities = /* @__PURE__ */ new Set();
      let cursor = 0;
      while (cursor < attrs.length && !/^\s*$/.test(attrs.slice(cursor))) {
        attribute2.lastIndex = cursor;
        const attr = attribute2.exec(attrs);
        if (!attr) {
          diagnostics.push({ severity: "error", message: `Malformed or unsupported attributes at offset ${match.index + tag.length + 1 + cursor}.` });
          break;
        }
        cursor = attribute2.lastIndex;
        const folded = attr[1].replace(/[A-Z]/g, (letter) => letter.toLowerCase());
        const identity = folded === "data-uip-node" || folded === "data-uip-component";
        const name = identity ? folded : attr[1];
        const value = attr[2] ?? attr[3] ?? attr[4];
        if (identity) {
          if (identities.has(name)) {
            diagnostics.push({ severity: "error", message: `Duplicate identity attribute ${name} at offset ${match.index}.` });
            continue;
          }
          identities.add(name);
          if (!value || /&(?!(?:quot|lt|gt|amp);)/.test(value) || selfClosing && attr[4] !== void 0 && cursor === attrs.length) {
            diagnostics.push({ severity: "error", message: `Malformed or unsupported identity value for ${name} at offset ${match.index}.` });
            continue;
          }
        }
        const ordinarySlash = !identity && selfClosing && attr[4] !== void 0 && cursor === attrs.length ? "/" : "";
        Object.defineProperty(attributes, name, { value: decode(value ?? "") + ordinarySlash, writable: true, enumerable: true, configurable: true });
      }
      const node = { id: attributes["data-uip-node"], tag, attributes, start: match.index, openEnd: token.lastIndex, closeStart: token.lastIndex, end: token.lastIndex, parent: stack.at(-1), children: [], manual: !attributes["data-uip-node"] };
      node.parent?.children.push(node);
      nodes.push(node);
      if (["script", "style", "textarea"].includes(tag)) {
        if (identities.size) diagnostics.push({ severity: "error", message: `Managed identity is unsupported on raw-text ${tag} at offset ${match.index}.` });
        const close = new RegExp(`</${tag}\\s*>`, "ig");
        close.lastIndex = token.lastIndex;
        const ending = close.exec(source2);
        if (ending) {
          node.closeStart = ending.index;
          node.end = close.lastIndex;
          token.lastIndex = close.lastIndex;
        } else diagnostics.push({ severity: "error", message: `Unclosed ${tag}.` });
        node.manual = true;
      } else if (!voidTags.has(tag) && !raw.endsWith("/>")) stack.push(node);
    }
    while (stack.length && optionalTags.has(stack.at(-1).tag)) implicitClose(source2.length);
    for (const node of stack) diagnostics.push({ severity: "error", message: `Unclosed ${node.tag}.` });
    const ids = /* @__PURE__ */ new Set();
    for (const node of nodes) if (node.id) {
      if (!/^[A-Za-z][\w-]*$/.test(node.id) || ids.has(node.id)) diagnostics.push({ severity: "error", message: `Invalid or duplicate node ID: ${node.id}.`, node: node.id });
      ids.add(node.id);
      if (!isWrapper(node) && !isWrapper(node.parent)) diagnostics.push({ severity: "warning", message: "Layout is manual because this node has no Builder wrapper.", node: node.id });
    }
    if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) for (const node of nodes) {
      delete node.id;
      delete node.attributes["data-uip-node"];
      delete node.attributes["data-uip-component"];
      node.manual = true;
    }
    return { nodes, diagnostics };
  }
  function isWrapper(node) {
    return Boolean(node?.attributes.class?.split(/\s+/).includes("uip-layout-item"));
  }
  function setNodeAttribute(source2, id, name, value) {
    if (!/^[\w:-]+$/.test(name)) throw new Error("Invalid attribute name.");
    const parsed = parseSource(source2);
    if (parsed.diagnostics.some((diagnostic) => diagnostic.severity === "error")) throw new Error("Repair source structure before editing attributes.");
    const node = parsed.nodes.find((n) => n.id === id);
    if (!node || node.manual || parsed.nodes.filter((n) => n.id === id).length !== 1) throw new Error("Select an unambiguous editor-managed node.");
    const opening = source2.slice(node.start, node.openEnd);
    const identityName = /^(data-uip-node|data-uip-component)$/i.test(name);
    const pattern = new RegExp(`\\s${name}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+))?(?=\\s|/?>)`, identityName ? "i" : "");
    const attr = ` ${name}="${escapeAttribute(value)}"`;
    const next = pattern.test(opening) ? opening.replace(pattern, () => attr) : opening.replace(/\s*\/?>$/, (end) => attr + end);
    return source2.slice(0, node.start) + next + source2.slice(node.openEnd);
  }
  function insertNode(source2, tag, componentId, parentId, newId = () => `node_${globalThis.crypto.randomUUID()}`, slot) {
    if (!/^[a-z][a-z0-9-]*$/.test(tag) || ["script", "style", "iframe"].includes(tag)) throw new Error("Unsupported insertion tag.");
    const parsed = parseSource(source2);
    if (parsed.diagnostics.some((d) => d.severity === "error")) throw new Error("Repair source structure before inserting.");
    const parent = parentId ? parsed.nodes.find((n) => n.id === parentId) : void 0;
    if (parentId && (!parent || parent.attributes["data-uip-component"] && slot === void 0 || voidTags.has(parent.tag))) throw new Error("Insert into an ordinary HTML container or layout wrapper.");
    const offset = parent?.closeStart ?? source2.length;
    const markup = `
<div class="uip-layout-item" data-uip-node="${newId()}"${slot !== void 0 ? ` slot="${escapeAttribute(slot)}"` : ""}>
  <${tag} data-uip-node="${newId()}"${componentId ? ` data-uip-component="${escapeAttribute(componentId)}"` : ""}>${voidTags.has(tag) ? "" : `</${tag}>`}
</div>
`;
    return source2.slice(0, offset) + markup + source2.slice(offset);
  }
  function moveNode(source2, id, direction) {
    const parsed = parseSource(source2);
    if (parsed.diagnostics.some((d) => d.severity === "error")) throw new Error("Repair source structure before moving.");
    const selected = parsed.nodes.find((n) => n.id === id);
    const node = isWrapper(selected?.parent) ? selected.parent : selected;
    if (!node || !node.id) throw new Error("Select a managed layout node.");
    const siblings = parsed.nodes.filter((n) => n.parent === node.parent);
    const adjacent = siblings[siblings.indexOf(node) + (direction === "up" ? -1 : 1)];
    if (!adjacent) return source2;
    if (!adjacent.id || adjacent.manual) throw new Error("Move only between managed siblings; edit manual regions in source.");
    const [first, second] = node.start < adjacent.start ? [node, adjacent] : [adjacent, node];
    return source2.slice(0, first.start) + source2.slice(second.start, second.end) + source2.slice(first.end, second.start) + source2.slice(first.start, first.end) + source2.slice(second.end);
  }

  // packages/visual-artifacts/src/model.ts
  function legacyPackageSettingContracts(pkg) {
    return Object.fromEntries(Object.entries(pkg.presentation?.settings ?? {}).flatMap(([key, value]) => {
      if (!/^[a-z][a-z0-9-]*$/.test(key)) return [];
      if (value.type === "select") return value.options?.length ? [[key, { type: typeof value.options[0] === "number" ? "number" : "string", enum: value.options, default: value.default }]] : [];
      return ["string", "number", "boolean"].includes(value.type) ? [[key, { type: value.type, default: value.default }]] : [];
    }));
  }
  function valueErrors(value, contract, label) {
    if (value === void 0 || value === null) return contract.required ? [`${label} is required.`] : [];
    const type = Array.isArray(value) ? "array" : typeof value;
    const errors = [];
    if (type !== contract.type || type === "number" && !Number.isFinite(value)) return [`${label} must be ${contract.type}.`];
    if (contract.enum && !contract.enum.some((item) => JSON.stringify(item) === JSON.stringify(value))) errors.push(`${label} is outside its allowed values.`);
    if (typeof value === "number" && (contract.minimum !== void 0 && value < contract.minimum || contract.maximum !== void 0 && value > contract.maximum)) errors.push(`${label} is outside its numeric bounds.`);
    if (typeof value === "string" && (contract.minLength !== void 0 && value.length < contract.minLength || contract.maxLength !== void 0 && value.length > contract.maxLength)) errors.push(`${label} is outside its length bounds.`);
    return errors;
  }
  function packageSettingErrors(definition, settings) {
    const contracts = definition.builder.settings, values = {};
    for (const [key, contract] of Object.entries(contracts)) values[key] = settings[key] ?? contract.default;
    const errors = [];
    for (const [key, value] of Object.entries(settings)) if (!contracts[key]) errors.push(`Unknown installed Package setting: ${key}.`);
    for (const [key, contract] of Object.entries(contracts)) {
      errors.push(...valueErrors(values[key], contract, key));
      if (contract.visibleWhen && values[contract.visibleWhen.setting] !== contract.visibleWhen.equals && values[key] !== contract.default) errors.push(`${key} is not allowed in this interaction mode.`);
    }
    for (const rule of definition.builder.validation ?? []) {
      if (rule.when && values[rule.when.setting] !== rule.when.equals) continue;
      if (rule.kind === "requiredWhen" && !String(values[rule.setting] ?? "").trim()) errors.push(`${rule.setting} is required.`);
      if (rule.kind === "oneOfRequiredWhen" && !rule.settings?.some((key) => String(values[key] ?? "").trim())) errors.push(`One of ${rule.settings?.join(", ")} is required.`);
      if (rule.kind === "accessibleNameWhenInteractive" && values.interactionMode !== "none" && !rule.settings?.some((key) => String(values[key] ?? "").trim())) errors.push("Interactive components need an accessible name.");
    }
    return errors;
  }
  function readPackageSettings(definition, attributes, stored) {
    const values = {};
    for (const [key, contract] of Object.entries(definition.builder.settings)) {
      const binding = contract.binding;
      if (binding?.kind === "attribute" && binding.name && Object.hasOwn(attributes, binding.name)) {
        const value = attributes[binding.name];
        values[key] = contract.type === "boolean" ? value !== "false" : contract.type === "number" ? Number(value) : value;
      }
    }
    return { ...values, ...stored };
  }

  // ../UI Platform Data Services/packages/dataset-operations/src/declarative-expression.ts
  var deny = () => {
    throw new Error("EXPRESSION_INVALID");
  };
  var unsafe = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);
  var exact = (x, keys) => Object.keys(x).length === keys.length && keys.every((k) => Object.hasOwn(x, k));
  function expressionDependencies(declaration) {
    const ids = /* @__PURE__ */ new Set();
    let count = 0;
    if (!declaration || !exact(declaration, ["version", "expression"]) || declaration.version !== 1) deny();
    const visit = (node, depth) => {
      if (!node || typeof node !== "object" || depth > 24 || ++count > 256) deny();
      if (node.kind === "literal") {
        if (!exact(node, ["kind", "value"]) || !["string", "number", "boolean"].includes(typeof node.value) || typeof node.value === "number" && !Number.isFinite(node.value)) deny();
      } else if (node.kind === "field") {
        if (!exact(node, ["kind", "fieldId"]) || typeof node.fieldId !== "string" || !node.fieldId || unsafe.has(node.fieldId)) deny();
        ids.add(node.fieldId);
      } else if (node.kind === "operator") {
        if (!exact(node, ["kind", "operator", "args"]) || !["add", "subtract", "multiply", "divide", "concat", "eq", "lt", "gt", "and", "or", "not", "if"].includes(node.operator) || !Array.isArray(node.args) || node.args.length !== (node.operator === "not" ? 1 : node.operator === "if" ? 3 : 2)) deny();
        node.args.forEach((arg) => visit(arg, depth + 1));
      } else deny();
    };
    visit(declaration.expression, 0);
    return [...ids];
  }
  function expressionType(declaration, fields3) {
    expressionDependencies(declaration);
    const infer = (node) => {
      if (node.kind === "literal") return typeof node.value;
      if (node.kind === "field") {
        const type = fields3.get(node.fieldId);
        if (!type || !["string", "number", "boolean"].includes(type)) return deny();
        return type;
      }
      const types = node.args.map(infer), op = node.operator;
      if (op === "if") {
        if (types[0] !== "boolean" || types[1] !== types[2]) deny();
        return types[1];
      }
      if (op === "not" || op === "and" || op === "or") {
        if (types.some((t) => t !== "boolean")) deny();
        return "boolean";
      }
      if (op === "eq") {
        if (types[0] !== types[1]) deny();
        return "boolean";
      }
      if (op === "concat") {
        if (types.some((t) => t !== "string")) deny();
        return "string";
      }
      if (types.some((t) => t !== "number")) deny();
      return op === "lt" || op === "gt" ? "boolean" : "number";
    };
    return infer(declaration.expression);
  }
  function calculationOrder(calculations, fields3) {
    const known = new Map(fields3.map((f) => [f.fieldId, f.type])), byId = new Map(calculations.map((c) => [c.fieldId, c]));
    if (known.size !== fields3.length || byId.size !== calculations.length) deny();
    const ordered = [], active2 = /* @__PURE__ */ new Set(), done = /* @__PURE__ */ new Set();
    const visit = (c) => {
      if (done.has(c.fieldId)) return;
      if (active2.has(c.fieldId)) throw new Error("EXPRESSION_CYCLE");
      active2.add(c.fieldId);
      if (typeof c.persist !== "boolean" || known.get(c.fieldId) !== c.type || expressionType(c.expression, known) !== c.type) deny();
      for (const id of expressionDependencies(c.expression)) {
        const next = byId.get(id);
        if (next) {
          if (c.persist && !next.persist) deny();
          visit(next);
        }
      }
      active2.delete(c.fieldId);
      done.add(c.fieldId);
      ordered.push(c);
    };
    calculations.forEach(visit);
    return ordered;
  }

  // packages/visual-artifacts/src/form.ts
  function formCalculations(metadata) {
    return (metadata.form?.fields ?? []).flatMap((f) => f.calculation ? [{ fieldId: f.datasetFieldId, type: f.type, ...f.calculation }] : []);
  }
  function formExpressionFields(metadata) {
    return (metadata.form?.fields ?? []).map((f) => ({ fieldId: f.datasetFieldId, key: f.key, type: f.type, required: !!f.datasetRequired }));
  }

  // packages/visual-artifacts/src/validation.ts
  function parseMetadata(text3) {
    try {
      const value = JSON.parse(text3);
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Metadata must be an object.");
      return { metadata: value, diagnostics: [] };
    } catch (error) {
      return { diagnostics: [{ severity: "error", message: `Metadata: ${String(error)}` }] };
    }
  }
  function validateArtifact(artifact, components = [], packages = [], services = []) {
    const diagnostics = [];
    const error = (message, node) => diagnostics.push({ severity: "error", message, node });
    const warning = (message, node) => diagnostics.push({ severity: "warning", message, node });
    const m = artifact.metadata;
    try {
      if (m.schemaVersion !== 1 || !["page", "component", "shell"].includes(m.kind)) error("Expected Visual Artifact schemaVersion 1 and page/component/shell kind.");
      if (!/^art_[\w-]+$/.test(m.artifactId ?? "")) error("A permanent art_ artifact identity is required.");
      if (!/^[a-z][a-z0-9-]*$/.test(m.name ?? "") || !m.displayName) error("Name and display name are required.");
      if (m.kind === "component") {
        if (!/^cmp_platform_[\w-]+$/.test(m.componentId ?? "")) error("A permanent cmp_platform_ Component identity is required.");
        if (m.route !== void 0) error("Only Pages may declare routes.");
        if (!m.public) error("A Component must declare its public interface.");
        if (packages.some((pkg) => pkg.id === m.componentId) || components.filter((c) => c.metadata.componentId === m.componentId).length > 1) error(`Duplicate Component identity: ${m.componentId}.`);
      } else if (m.kind === "shell") {
        if (m.route !== void 0 || m.componentId !== void 0) error("Shells cannot declare routes or Component identities.");
      } else if (!m.route?.startsWith("/") || m.componentId !== void 0 || m.public !== void 0) error("A Page needs a route and cannot declare a Component identity/public interface.");
      const checkContract = (contract, name) => {
        if (!contract || !["string", "number", "boolean", "object", "array"].includes(contract.type)) {
          error(`Invalid property type: ${name}.`);
          return;
        }
        if (contract.default !== void 0) {
          for (const message of valueErrors(contract.default, contract, name)) error(message);
        }
      };
      for (const [name, contract] of Object.entries(m.public?.properties ?? {})) {
        if (!/^[A-Za-z][\w]*$/.test(name)) error(`Invalid public property name: ${name}.`);
        checkContract(contract, name);
      }
      for (const [name, event] of Object.entries(m.public?.events ?? {})) for (const [key, contract] of Object.entries(event.payload)) checkContract(contract, `${name}.${key}`);
      if (new Set(m.public?.slots).size !== (m.public?.slots.length ?? 0)) error("Duplicate public slot names.");
      const parsed = parseSource(artifact.source);
      diagnostics.push(...parsed.diagnostics);
      if (parsed.diagnostics.some((diagnostic) => diagnostic.severity === "error")) return diagnostics;
      const nodes = new Map(parsed.nodes.filter((n) => n.id).map((n) => [n.id, n]));
      if (m.modes) {
        if (!Object.hasOwn(m.modes.overrides, m.modes.default)) error("Default mode must exist.");
        for (const overrides of Object.values(m.modes.overrides)) for (const [node, override] of Object.entries(overrides)) {
          if (!nodes.has(node)) error(`Unknown mode node: ${node}.`);
          if (Object.keys(override).some((key) => !["visible", "editable", "required", "label", "help", "default"].includes(key))) error("Unsupported mode override.");
          for (const key of ["visible", "editable", "required"]) if (override[key] !== void 0 && typeof override[key] !== "boolean") error(`Mode ${key} must be boolean.`);
        }
      }
      if (Boolean(m.capabilities?.includes("form")) !== Boolean(m.form)) error("Form capability and Form definition must be declared together.");
      if (m.form) {
        if (m.kind !== "component") error("A Form must be a Platform Component.");
        if (!m.form.datasetId) warning("Configure a Dataset target before submission.");
        if (!nodes.has(m.form.node)) error("Unknown Form root node.");
        if (!/^[A-Za-z][\w]*$/.test(m.form.primaryKey)) error("Invalid Form primary key.");
        if (!m.modes) error("A Form must declare a restrictive default mode.");
        if (!m.form.submit.service || !m.form.submit.readService) error("Form write/read adapters must be explicit.");
        const keys = /* @__PURE__ */ new Set(), identities = /* @__PURE__ */ new Set(), fieldNodes = /* @__PURE__ */ new Set();
        for (const field of m.form.fields) {
          if (!/^[A-Za-z][\w-]*$/.test(field.id) || identities.has(field.id) || fieldNodes.has(field.node) || keys.has(field.key)) error("Form field identity, node and mapping must be unique.");
          identities.add(field.id);
          fieldNodes.add(field.node);
          keys.add(field.key);
          if (!nodes.has(field.node) || !/^[A-Za-z][\w]*$/.test(field.key) || !field.datasetFieldId) error("Form fields require an explicit node and stable Dataset mapping.");
          if (!["string", "number", "boolean", "object", "array"].includes(field.type)) error("Invalid Form field value type.");
          let parent = nodes.get(field.node)?.parent;
          while (parent && parent.id !== m.form.node) parent = parent.parent;
          if (!parent) error("Mapped Form controls must belong to the Form root.");
          if (field.datasetRequired && field.required === false) error("Dataset-required validation cannot be weakened.");
          for (const overrides of Object.values(m.modes?.overrides ?? {})) if (field.datasetRequired && overrides[field.node]?.required === false) error("A mode cannot weaken Dataset-required validation.");
        }
        calculationOrder(formCalculations(m), formExpressionFields(m));
      }
      const sourceNames = /* @__PURE__ */ new Set(["public", "local", "route", "context", "event", ...Object.keys(m.sources ?? {}), ...(m.repeaters ?? []).flatMap((r) => [r.item, ...r.index ? [r.index] : []])]);
      const expression = (expr) => {
        if (typeof expr === "string") {
          if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\.[0-9]+)*$/.test(expr) || expr.split(".").some((p) => ["constructor", "prototype", "__proto__"].includes(p))) error(`Invalid named-source path: ${expr}.`);
          else if (!sourceNames.has(expr.split(".")[0])) error(`Unknown named source: ${expr}.`);
          else if (expr.startsWith("public.") && !Object.hasOwn(m.public?.properties ?? {}, expr.split(".")[1])) error(`Undeclared public input: ${expr}.`);
        } else if (expr && "version" in expr) {
          expressionType(expr, new Map(formExpressionFields(m).map((f) => [f.fieldId, f.type])));
        } else if (expr && "literal" in expr) return;
        else if (expr && ["not", "eq", "and", "or"].includes(expr.op) && Array.isArray(expr.args)) expr.args.forEach(expression);
        else error("Invalid declarative expression.");
      };
      const requireNode = (id) => {
        if (!nodes.has(id)) error(`Unknown managed node: ${id}.`, id);
        return nodes.get(id);
      };
      for (const node of parsed.nodes) {
        const id = node.attributes["data-uip-component"];
        if (node.tag === "uip-page" || node.attributes["data-uip-page"]) error("Pages cannot be nested.", node.id);
        if (node.tag === "uip-slot" && !m.public?.slots.includes(node.attributes.name ?? "")) error(`Undeclared public slot: ${node.attributes.name}.`, node.id);
        if (!id) {
          if (node.tag.startsWith("uib-")) warning(`Manual package element ${node.tag} has no permanent Component reference.`, node.id);
          continue;
        }
        const nested = components.filter((c) => c.metadata.componentId === id);
        const pkg = packages.filter((p) => p.id === id);
        if (nested.length + pkg.length !== 1) {
          error(`Unknown or ambiguous Component dependency: ${id}.`, node.id);
          continue;
        }
        if (nested[0] && node.tag !== "uip-component") error("Platform Component instances use uip-component.", node.id);
        if (node.children.length && node.children.some((child) => !child.attributes.slot)) warning("Component children should use declared named slots.", node.id);
        let settings = {};
        try {
          settings = JSON.parse(node.attributes["data-uip-settings"] ?? "{}");
          if (!settings || Array.isArray(settings) || typeof settings !== "object") throw new Error();
        } catch {
          error("Component settings must be a JSON object.", node.id);
          continue;
        }
        if (nested[0]) {
          const api = nested[0].metadata.public;
          for (const key of Object.keys(settings)) if (!Object.hasOwn(api.properties, key)) error(`Unknown public property: ${key}.`, node.id);
          for (const [key, contract] of Object.entries(api.properties)) {
            if (!(m.bindings ?? []).some((b) => b.node === node.id && b.target === `property:${key}`)) for (const message of valueErrors(settings[key] ?? contract.default, contract, key)) error(message, node.id);
          }
          for (const child of node.children) if (!api.slots.includes(child.attributes.slot ?? "")) error(`Unknown public slot: ${child.attributes.slot}.`, node.id);
        } else {
          if (pkg[0].tagName !== node.tag) error("Component tag does not match its installed identity.", node.id);
          pkg[0].activationIssues?.forEach((issue) => error(issue, node.id));
          const definitions = pkg[0].definition?.builder.settings;
          if (pkg[0].definition) {
            for (const child of node.children) if (!pkg[0].definition.runtime.slots.some((slot) => slot.name === (child.attributes.slot || "default"))) error(`Unknown installed Package slot: ${child.attributes.slot}.`, node.id);
          }
          if (pkg[0].definition) settings = readPackageSettings(pkg[0].definition, node.attributes, settings);
          if (pkg[0].definition && !(m.bindings ?? []).some((binding) => binding.node === node.id && binding.target.startsWith("setting:"))) packageSettingErrors(pkg[0].definition, settings).forEach((message) => error(message, node.id));
          for (const [key, value] of Object.entries(settings)) {
            const contract = definitions?.[key];
            if (definitions && !contract) error(`Unknown installed Package setting: ${key}.`, node.id);
            else if (contract) valueErrors(value, contract, key).forEach((message) => error(message, node.id));
            else if (legacyPackageSettingContracts(pkg[0])[key]) valueErrors(value, legacyPackageSettingContracts(pkg[0])[key], key).forEach((message) => error(message, node.id));
            else if (![...pkg[0].properties ?? [], ...pkg[0].attributes ?? []].includes(key)) error(`Package setting is not declared: ${key}.`, node.id);
          }
        }
      }
      for (const binding of m.bindings ?? []) {
        const node = requireNode(binding.node);
        expression(binding.value);
        if (!/^(text|attribute:[\w:-]+|property:[\w]+|setting:[\w]+|style:--[\w-]+)$/.test(binding.target)) error(`Unsupported binding target: ${binding.target}.`, binding.node);
        const nested = components.find((c) => c.metadata.componentId === node?.attributes["data-uip-component"]);
        if (nested && (!binding.target.startsWith("property:") || !Object.hasOwn(nested.metadata.public?.properties ?? {}, binding.target.slice(9)))) error("Nested Components expose only declared public properties.", binding.node);
        const pkg = packages.find((p) => p.id === node?.attributes["data-uip-component"]);
        if (pkg && binding.target.startsWith("setting:") && !pkg.definition?.builder.settings[binding.target.slice(8)]) error("Unknown installed Package setting binding.", binding.node);
      }
      for (const condition of m.conditions ?? []) {
        requireNode(condition.node);
        expression(condition.when);
        if (typeof condition.when !== "string" && "version" in condition.when && expressionType(condition.when, new Map(formExpressionFields(m).map((f) => [f.fieldId, f.type]))) !== "boolean") error("Versioned conditions must return Boolean values.", condition.node);
      }
      for (const repeater of m.repeaters ?? []) {
        requireNode(repeater.node);
        expression(repeater.collection);
        if (!/^[A-Za-z]\w*$/.test(repeater.item) || ["public", "local", "route", "context", "event", ...Object.keys(m.sources ?? {})].includes(repeater.item)) error("Repeater alias conflicts with a named source.");
      }
      const action = (item) => {
        if (item.kind === "set") {
          if (!Object.hasOwn(m.state ?? {}, item.state)) error(`Unknown local state: ${item.state}.`);
          expression(item.value);
        } else if (item.kind === "emit") {
          const contract = m.public?.events[item.event];
          if (!contract) error(`Undeclared public event: ${item.event}.`);
          else {
            for (const [key, field] of Object.entries(contract.payload)) if (field.required && !Object.hasOwn(item.payload ?? {}, key)) error(`Public event ${item.event} requires payload field ${key}.`);
            for (const key of Object.keys(item.payload ?? {})) if (!Object.hasOwn(contract.payload, key)) error(`Unknown public event payload field: ${key}.`);
          }
          Object.values(item.payload ?? {}).forEach(expression);
        } else if (item.kind === "navigate") expression(item.to);
        else if (item.kind === "service") {
          if (!services.includes(item.reference)) warning(`Service reference is supported but has no executable adapter: ${item.reference}.`);
          if (item.input) expression(item.input);
        } else if (item.kind === "workflow") {
          if (!item.workflowId || typeof item.workflowId !== "string") error("Permanent Workflow identity is required.");
          expression(item.primaryRecordId);
          if (item.resultState && !Object.hasOwn(m.state ?? {}, item.resultState)) error("Workflow result state must be declared.");
        } else if (item.kind === "record-delete") {
          if (item.version !== 1 || !item.datasetId || typeof item.datasetId !== "string" || !item.primaryFieldId || typeof item.primaryFieldId !== "string" || Object.keys(item).some((key) => !["kind", "version", "datasetId", "primaryFieldId", "recordId", "resultState"].includes(key))) error("Invalid versioned single-record delete declaration.");
          expression(item.recordId);
          if (typeof item.resultState !== "string" || !item.resultState || !m.state || typeof m.state !== "object" || Array.isArray(m.state) || !Object.hasOwn(m.state, item.resultState)) error("Record delete result state must be explicitly declared.");
        } else if (item.kind !== "function") error("Unknown action kind.");
      };
      for (const event of m.events ?? []) {
        const node = requireNode(event.node);
        const nested = components.find((c) => c.metadata.componentId === node?.attributes["data-uip-component"]);
        if (nested && !nested.metadata.public?.events[event.event]) error(`Undeclared nested public event: ${event.event}.`, event.node);
        event.actions.forEach(action);
      }
      m.onLoad?.forEach(action);
      for (const [name, source2] of Object.entries(m.sources ?? {})) if (source2.kind === "service" && !services.includes(source2.reference ?? "")) warning(`Named source ${name} is supported but has no executable adapter: ${source2.reference}.`);
      for (const id of Object.keys(m.layout ?? {})) if (!isWrapper(requireNode(id))) error("Declarative layout requires a Builder wrapper.", id);
      const workflowIds = [...m.onLoad ?? [], ...(m.events ?? []).flatMap((event) => event.actions)].flatMap((action2) => action2.kind === "workflow" ? [action2.workflowId] : []);
      for (const id of m.dependencies ?? []) if (!components.some((c) => c.metadata.componentId === id) && !packages.some((p) => p.id === id) && !services.includes(id) && !workflowIds.includes(id)) error(`Unknown dependency: ${id}.`);
      const visit = (current2, path) => {
        const id = current2.metadata.componentId ?? current2.metadata.artifactId;
        if (path.includes(id)) {
          error(`Component dependency cycle: ${[...path, id].join(" \u2192 ")}.`);
          return;
        }
        for (const ref of /* @__PURE__ */ new Set([...componentReferences(current2.source), ...current2.metadata.dependencies ?? []])) {
          const next = components.find((c) => c.metadata.componentId === ref);
          if (next) visit(next, [...path, id]);
        }
      };
      visit(artifact, []);
    } catch (cause) {
      error(`Invalid artifact structure: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
    return diagnostics;
  }
  function componentReferences(source2) {
    return [...new Set(parseSource(source2).nodes.map((n) => n.attributes["data-uip-component"]).filter(Boolean))];
  }

  // packages/visual-artifacts/src/composition.ts
  var recommendedRegionIds = ["region-header", "region-navigation", "region-hero", "region-main", "region-sidebar", "region-secondary", "region-footer"];
  function regions(source2) {
    const parsed = parseSource(source2);
    if (parsed.diagnostics.some((d) => d.severity === "error")) throw new Error("Repair region source structure first: " + parsed.diagnostics.filter((d) => d.severity === "error").map((d) => d.message).join(" "));
    const ids = /* @__PURE__ */ new Set();
    return parsed.nodes.filter((node) => Object.hasOwn(node.attributes, "data-uip-region")).map((node) => {
      const regionId = node.attributes["data-uip-region"];
      if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(regionId) || ids.has(regionId)) throw new Error(`Invalid or duplicate Region ID: ${regionId}.`);
      ids.add(regionId);
      return { regionId, displayName: node.attributes["data-uip-region-name"] ?? regionId, nodeId: node.id, content: source2.slice(node.openEnd, node.closeStart), start: node.start, openEnd: node.openEnd, closeStart: node.closeStart, end: node.end };
    });
  }
  function routePath(route, params = {}) {
    return route.path.replace(/:([A-Za-z][\w]*)|\[([A-Za-z][\w]*)\]/g, (_, colon, bracket) => {
      const value = params[colon ?? bracket];
      if (value === void 0) throw new Error(`Route parameter is required: ${colon ?? bracket}.`);
      return encodeURIComponent(value);
    });
  }
  function matchCompositionRoute(routes, pathname) {
    for (const route of [...routes].sort((a, b) => Number(/:|\[/.test(a.path)) - Number(/:|\[/.test(b.path)))) {
      const keys = [];
      const pattern = route.path.split("/").map((part) => {
        const parameter = /^(?::([A-Za-z][\w]*)|\[([A-Za-z][\w]*)\])$/.exec(part);
        if (parameter) {
          keys.push(parameter[1] ?? parameter[2]);
          return "([^/]+)";
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }).join("/");
      const match = new RegExp(`^${pattern}/?$`).exec(pathname);
      if (match) return { route, params: Object.fromEntries(keys.map((key, i) => [key, decodeURIComponent(match[i + 1])])) };
    }
    return void 0;
  }

  // src/client/visual-artifacts/saved-card-target.ts
  var CARD_DEFINITION_ID = "cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1";
  function immutableSavedCard(value) {
    if (value && typeof value === "object") {
      for (const child of Object.values(value)) immutableSavedCard(child);
      Object.freeze(value);
    }
    return value;
  }
  function savedCardContextKey(context2) {
    const text3 = (value) => typeof value === "string" && value.length > 0;
    if (!text3(context2?.applicationId) || !text3(context2?.subjectId) || !text3(context2?.sessionRevision) || context2?.page?.format !== "visual" || context2.page.owner?.kind !== "application" || context2.page.owner.id !== context2.applicationId || !text3(context2.page.id) || !/^art_[\w-]+$/.test(context2.page.id) || context2.page.repairLocator !== void 0 || context2.page.owner.revision !== void 0 && !text3(context2.page.owner.revision)) return;
    return JSON.stringify([context2.applicationId, context2.page.owner.kind, context2.page.owner.id, context2.page.owner.revision ?? null, context2.page.id, context2.subjectId, context2.sessionRevision]);
  }
  async function identifyRetainedSavedCard(input2) {
    const generation = { ...input2.generation };
    const refuse = (reason) => immutableSavedCard({ state: "unavailable", reason, generation, target: null });
    try {
      const { context: context2, bundle, baseline, candidate, packages, componentIds } = input2;
      if (!savedCardContextKey(context2)) return refuse("NO_CONTEXT");
      if (!candidate) return refuse("NO_SELECTION");
      if (typeof bundle.hash !== "string" || !/^[a-f0-9]{64}$/.test(bundle.hash) || ["source", "css", "metadata", "fixtures", "code"].some((role) => typeof baseline[role] !== "string") || JSON.stringify(bundle.files) !== JSON.stringify(baseline)) return refuse("SOURCE_UNCERTAIN");
      const parsedMetadata = parseMetadata(baseline.metadata), metadata = parsedMetadata.metadata;
      if (!metadata || parsedMetadata.diagnostics.some((d2) => d2.severity === "error") || metadata.kind !== "page" || metadata.artifactId !== context2.page.id || !bundle.metadata || JSON.stringify(metadata) !== JSON.stringify(bundle.metadata) || bundle.diagnostics.some((d2) => d2.severity === "error")) return refuse("INVALID_SOURCE");
      const parsed = parseSource(baseline.source);
      if (parsed.diagnostics.some((d2) => d2.severity === "error")) return refuse("INVALID_SOURCE");
      const nodes = parsed.nodes.filter((node2) => node2.id === candidate);
      if (nodes.length !== 1) return refuse("MISSING_NODE");
      const node = nodes[0];
      if (node.manual || node.tag !== "uib-card" || node.attributes["data-uip-component"] !== CARD_DEFINITION_ID || !node.parent?.id || node.parent.manual || !node.parent.attributes.class?.split(/\s+/).includes("uip-layout-item")) return refuse("UNSUPPORTED_NODE");
      const matches = packages.filter((pkg2) => pkg2.id === CARD_DEFINITION_ID);
      if (matches.length > 1 || componentIds.includes(CARD_DEFINITION_ID)) return refuse("AMBIGUOUS_DEFINITION");
      if (!matches.length) return refuse("MISSING_DEFINITION");
      const pkg = matches[0];
      const d = pkg.definition;
      if (!d || d.schemaVersion !== "1.0.0" || d.identity?.componentId !== CARD_DEFINITION_ID || pkg.tagName !== "uib-card" || pkg.packageName !== "@ui-base/ui" || d.ownership?.scope !== "platform" || d.ownership.package?.scope !== "platform" || d.ownership.package.packageId !== pkg.packageName || typeof pkg.packageVersion !== "string" || !pkg.packageVersion || d.ownership.package.version !== pkg.packageVersion || d.version?.packageVersion !== pkg.packageVersion || !Object.hasOwn(d.version, "revisionId") || !(d.version.revisionId === null || typeof d.version.revisionId === "string" && d.version.revisionId.length > 0) || d.implementation?.type !== "code" || d.implementation.tagName !== "uib-card" || typeof d.implementation.importPath !== "string" || !d.implementation.importPath.startsWith("@ui-base/ui/") || typeof d.implementation.exportName !== "string" || !/^[A-Za-z_$][\w$]*$/.test(d.implementation.exportName) || d.implementation.runtimeBinding?.kind !== "custom-element" || d.implementation.runtimeBinding.tagName !== "uib-card") return refuse("INVALID_DEFINITION");
      const unsupported = ["shellId", "modes", "form", "bindings", "conditions", "repeaters", "events", "onLoad", "sources", "state", "dependencies"];
      if (unsupported.some((key) => metadata[key] !== void 0) || !["", "export {};"].includes(baseline.code.trim()) || parsed.nodes.some((n) => ["script", "iframe", "object", "embed", "template", "base", "link"].includes(n.tag) || Object.keys(n.attributes).some((name) => /^on/i.test(name) || name.startsWith("data-uip-") && !["data-uip-node", "data-uip-component", "data-uip-settings"].includes(name)) || n.attributes["data-uip-component"] && n.attributes["data-uip-component"] !== CARD_DEFINITION_ID)) return refuse("UNSUPPORTED_SEMANTICS");
      if (validateArtifact({ metadata, source: baseline.source, css: baseline.css }, [], packages).some((d2) => d2.severity === "error")) return refuse("INVALID_SOURCE");
      const stored = JSON.parse(node.attributes["data-uip-settings"] ?? "{}");
      const settings = readPackageSettings(pkg.definition, node.attributes, stored);
      if ((settings.interactionMode ?? pkg.definition.builder.settings.interactionMode?.default) !== "none") return refuse("UNSUPPORTED_SEMANTICS");
      const allowed2 = /* @__PURE__ */ new Set(["class", "data-uip-node", "data-uip-component", "data-uip-settings", ...Object.values(pkg.definition.builder.settings).flatMap((c) => c.binding?.kind === "attribute" && c.binding.name ? [c.binding.name] : [])]);
      if (Object.keys(node.attributes).some((name) => !allowed2.has(name))) return refuse("UNSUPPORTED_SEMANTICS");
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(baseline)))), (byte) => byte.toString(16).padStart(2, "0")).join("");
      if (hash !== bundle.hash) return refuse("SOURCE_UNCERTAIN");
      return immutableSavedCard({ state: "identified", reason: "RETAINED_SAVED_VERSION_ONLY", generation, target: {
        source: { applicationId: context2.applicationId, page: { owner: { kind: "application", id: context2.page.owner.id, ...context2.page.owner.revision === void 0 ? {} : { revision: context2.page.owner.revision } }, format: "visual", id: context2.page.id }, committedHash: bundle.hash, nodeId: candidate },
        implementation: { componentId: CARD_DEFINITION_ID, packageId: pkg.packageName, packageVersion: pkg.packageVersion, importPath: d.implementation.importPath, exportName: d.implementation.exportName, definitionRevision: d.version.revisionId },
        context: { subjectId: context2.subjectId, sessionRevision: context2.sessionRevision }
      } });
    } catch {
      return refuse("SOURCE_UNCERTAIN");
    }
  }

  // tests/saved-card-selection/fixtures.ts
  var context = { applicationId: "original-permanent-app", page: { owner: { kind: "application", id: "original-permanent-app", revision: "owner-1" }, format: "visual", id: "art_original_page" }, subjectId: "original-subject", sessionRevision: "original-session" };
  var source = `<div class="uip-layout-item" data-uip-node="wrapper"><uib-card data-uip-node="saved" data-uip-component="${CARD_DEFINITION_ID}"></uib-card></div>`;
  var digest = async (value) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), (b) => b.toString(16).padStart(2, "0")).join("");
  async function fixture(markup = source, metadataExtra = {}) {
    const metadata = { schemaVersion: 1, artifactId: context.page.id, kind: "page", name: "saved-memory", displayName: "Saved memory", route: "/", ...metadataExtra };
    const files = { source: markup, css: "uib-card { display: block; }", metadata: JSON.stringify(metadata), fixtures: "{}", code: "export {};" };
    const definition = structuredClone(ui_component_default.components.find((c) => c.identity?.componentId === CARD_DEFINITION_ID));
    return { context: structuredClone(context), bundle: { locator: "memory/page.visual.json", files, hash: await digest(JSON.stringify(files)), metadata, diagnostics: [] }, baseline: structuredClone(files), candidate: "saved", packages: [{ id: CARD_DEFINITION_ID, tagName: "uib-card", packageName: "@ui-base/ui", packageVersion: "0.5.1", definition }], componentIds: [], generation: { selection: 3, source: 5 } };
  }

  // tests/card-request-integration/session-facade.ts
  var session = { revision: context.sessionRevision, principal: { subjectId: context.subjectId } };
  var epoch = 0;
  var listeners = /* @__PURE__ */ new Set();
  var sessionCalls = [];
  function editorSessionSnapshot() {
    return structuredClone(session);
  }
  function subscribeEditorSession(fn) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }
  function changeSession(subject = false) {
    session = { revision: "changed-session", principal: { subjectId: subject ? "changed-subject" : context.subjectId } };
    epoch++;
    for (const fn of [...listeners]) fn();
  }
  function sessionObserverCount() {
    return listeners.size;
  }
  function createEditorSessionBinding() {
    let revoked = false;
    const captured = epoch;
    const assert = () => {
      if (revoked || captured !== epoch) throw Error("MEMORY_SESSION_CHANGED");
    };
    return { assert, revoke() {
      revoked = true;
    }, async headers() {
      assert();
      sessionCalls.push("headers");
      return { "x-editor-revision": session.revision, "x-editor-csrf": "authored-not-a-credential" };
    } };
  }

  // tests/card-request-integration/boundary-facade.ts
  var unexpected = [];
  var forbidden = (name) => {
    unexpected.push(name);
    throw Error("UNADMITTED_BRANCH " + name);
  };
  var EditorRuntimeContext = class {
    constructor(..._args) {
      forbidden("EditorRuntimeContext");
    }
  };
  var mountEditorShell = (..._args) => forbidden("mountEditorShell");
  var mountCompositionManager = (..._args) => forbidden("mountCompositionManager");
  var mountAutomationEditor = (..._args) => forbidden("mountAutomationEditor");
  var createVisualFormTransport = (..._args) => forbidden("createVisualFormTransport");
  var bindFormEditor = (..._args) => forbidden("bindFormEditor");
  var allowed;
  var boundaryCalls = [];
  function permitWorkspace(value) {
    allowed = structuredClone(value);
  }
  async function authorizeWorkspace(key, target) {
    if (!allowed) return forbidden("default authorizeWorkspace");
    boundaryCalls.push({ key, target });
    const result = allowed;
    allowed = void 0;
    return structuredClone(result);
  }

  // src/client/visual-artifacts/menu-controls.ts
  function chooseNamedValue(title, choices) {
    return new Promise((resolve) => {
      const dialog = document.createElement("dialog");
      dialog.setAttribute("aria-label", title);
      const form = document.createElement("form");
      form.method = "dialog";
      const label = document.createElement("label");
      label.textContent = title;
      const select = document.createElement("select");
      select.setAttribute("aria-label", title);
      select.required = true;
      for (const item of choices) select.add(new Option(item.label, item.value));
      label.append(select);
      const apply = document.createElement("button");
      apply.textContent = "Apply selection";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Cancel";
      cancel.onclick = () => dialog.close();
      form.append(label, apply, cancel);
      dialog.append(form);
      let result;
      form.onsubmit = (event) => {
        event.preventDefault();
        result = select.value;
        dialog.close();
      };
      dialog.onclose = () => {
        dialog.remove();
        resolve(result);
      };
      document.body.append(dialog);
      dialog.showModal();
    });
  }

  // src/shared/platform-settings.ts
  var defaultAutosave = Object.freeze({ enabled: true, delayMs: 2e3 });
  var record = (value) => !!value && typeof value === "object" && !Array.isArray(value);
  function validateAutosave(value) {
    if (!record(value) || Object.keys(value).some((key) => !["enabled", "delayMs"].includes(key)) || typeof value.enabled !== "boolean" || !Number.isInteger(value.delayMs) || value.delayMs < 100 || value.delayMs > 6e4 || value.delayMs % 10 !== 0)
      throw new Error("Autosave requires a boolean enabled value and an integer delay of 100\u201360000 milliseconds in increments of 10.");
  }

  // src/client/artifact-editor/autosave-configuration.ts
  var current = { ...defaultAutosave };
  var listeners2 = /* @__PURE__ */ new Set();
  function autosaveConfiguration() {
    return { ...current };
  }
  function configureAutosave(value) {
    validateAutosave(value);
    if (current.enabled === value.enabled && current.delayMs === value.delayMs) return;
    current = { ...value };
    for (const listener of listeners2) listener({ ...current });
  }
  function subscribeAutosave(listener) {
    listeners2.add(listener);
    return () => {
      listeners2.delete(listener);
    };
  }

  // src/client/artifact-editor/editing-lifecycle.ts
  var EditingLifecycle = class {
    constructor(value, save, equal = (a, b) => JSON.stringify(a) === JSON.stringify(b), limits = { entries: 100, bytes: 8 * 1024 * 1024 }) {
      this.save = save;
      this.equal = equal;
      this.limits = limits;
      this.current = structuredClone(value);
      this.baseline = structuredClone(value);
      this.unsubscribeAutosave = subscribeAutosave((value2) => {
        this.autosave = value2;
        this.lastEdit = Date.now();
        this.schedule();
        this.emit();
      });
    }
    save;
    equal;
    limits;
    current;
    baseline;
    generation = 0;
    savedGeneration = 0;
    state = "idle";
    failure;
    notice;
    suspended = false;
    disposed = false;
    inFlight;
    timer;
    lastEdit = 0;
    past = [];
    future = [];
    group;
    groupTime = 0;
    uncertain = false;
    listeners = /* @__PURE__ */ new Set();
    autosave = autosaveConfiguration();
    unsubscribeAutosave;
    get dirty() {
      return this.uncertain || !this.equal(this.current, this.baseline);
    }
    get canUndo() {
      return !this.suspended && !this.disposed && !!this.past.length;
    }
    get canRedo() {
      return !this.suspended && !this.disposed && !!this.future.length;
    }
    get historySize() {
      return { entries: this.past.length + this.future.length, bytes: [...this.past, ...this.future].reduce((n, entry) => n + entry.bytes, 0) };
    }
    subscribe(listener) {
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    }
    emit() {
      for (const listener of this.listeners) listener();
    }
    entry(value) {
      const retained = structuredClone(value), seen = /* @__PURE__ */ new WeakSet();
      const estimate = (item) => {
        if (typeof item === "string") return 32 + item.length * 2;
        if (!item || typeof item !== "object") return 8;
        if (seen.has(item)) return 0;
        seen.add(item);
        return 64 + Object.entries(item).reduce((bytes, [key, child]) => bytes + 16 + key.length * 2 + estimate(child), 0);
      };
      return { value: retained, bytes: estimate(retained) };
    }
    bound() {
      while (this.historySize.entries > this.limits.entries || this.historySize.bytes > this.limits.bytes) {
        if (this.past.length) this.past.shift();
        else this.future.shift();
      }
    }
    edit(value, group) {
      if (this.suspended || this.disposed) throw new Error("Editing access is suspended or closed.");
      if (this.equal(value, this.current)) return;
      const now = Date.now();
      if (!group || group !== this.group || now - this.groupTime > 750) this.past.push(this.entry(this.current));
      this.future = [];
      this.group = group;
      this.groupTime = now;
      this.bound();
      this.current = structuredClone(value);
      this.changed();
    }
    changed() {
      this.generation++;
      this.lastEdit = Date.now();
      this.notice = void 0;
      if (this.state !== "conflict") {
        this.state = this.inFlight ? "saving" : this.dirty ? "pending" : "saved";
        this.failure = void 0;
      }
      this.schedule();
      this.emit();
    }
    undo() {
      if (!this.canUndo) return;
      this.future.push(this.entry(this.current));
      this.current = this.past.pop().value;
      this.group = void 0;
      this.bound();
      this.changed();
    }
    redo() {
      if (!this.canRedo) return;
      this.past.push(this.entry(this.current));
      this.current = this.future.pop().value;
      this.group = void 0;
      this.bound();
      this.changed();
    }
    schedule() {
      clearTimeout(this.timer);
      if (!this.autosave.enabled || this.disposed || this.suspended || this.inFlight || this.failure || this.state === "conflict" || this.state === "error" || !this.dirty) return;
      this.timer = setTimeout(() => {
        void this.flush();
      }, Math.max(0, this.autosave.delayMs - (Date.now() - this.lastEdit)));
    }
    async flush() {
      clearTimeout(this.timer);
      if (this.inFlight) {
        await this.inFlight;
        if (this.state !== "error" && this.state !== "conflict") return this.flush();
        return;
      }
      if (this.disposed || this.suspended || this.state === "conflict") return;
      if (!this.dirty) {
        this.savedGeneration = this.generation;
        this.state = "saved";
        this.emit();
        return;
      }
      const candidate = structuredClone(this.current), baseline = structuredClone(this.baseline), generation = this.generation;
      this.state = "saving";
      this.failure = void 0;
      this.emit();
      this.inFlight = (async () => {
        try {
          const saved = await this.save(candidate, baseline);
          this.baseline = structuredClone(saved);
          this.savedGeneration = generation;
          this.uncertain = false;
          if (this.generation === generation) this.current = structuredClone(saved);
          if (this.state !== "conflict") this.state = this.dirty ? "pending" : "saved";
        } catch (error) {
          const failure = error;
          if (this.state !== "conflict") {
            const invalid2 = failure.status === 422 || failure.validation?.valid === false;
            if (invalid2 && this.generation !== generation) {
              this.state = this.dirty ? "pending" : "saved";
              this.failure = void 0;
            } else {
              this.state = failure.status === 409 ? "conflict" : invalid2 ? "pending" : "error";
              this.failure = failure.message ?? String(error);
              if (this.state === "error") this.uncertain = true;
            }
          }
        }
      })();
      await this.inFlight;
      this.inFlight = void 0;
      if (this.generation !== generation || !this.failure) this.schedule();
      this.emit();
    }
    conflict(message = "Source changed outside Builder. Compare or reload; local changes retained.") {
      clearTimeout(this.timer);
      this.state = "conflict";
      this.failure = message;
      this.emit();
    }
    reset(remote, local = remote) {
      if (this.inFlight) throw new Error("Wait for the admitted save before replacing the baseline.");
      clearTimeout(this.timer);
      this.uncertain = false;
      this.baseline = structuredClone(remote);
      this.current = structuredClone(local);
      this.past = [];
      this.future = [];
      this.group = void 0;
      this.generation++;
      this.savedGeneration = this.dirty ? this.generation - 1 : this.generation;
      this.state = this.dirty ? "pending" : "idle";
      this.failure = void 0;
      this.notice = "Source baseline replaced. Undo/Redo history reset.";
      this.schedule();
      this.emit();
    }
    confirmBaseline(remote) {
      if (!this.equal(remote, this.baseline)) throw new Error("Changed source requires explicit baseline replacement.");
      this.baseline = structuredClone(remote);
      this.uncertain = false;
    }
    suspend() {
      this.suspended = true;
      clearTimeout(this.timer);
      this.emit();
    }
    resume() {
      if (this.disposed) throw new Error("Editor is closed.");
      if (!this.suspended) return;
      this.suspended = false;
      this.schedule();
      this.emit();
    }
    async dispose() {
      this.suspend();
      if (this.inFlight) await this.inFlight;
      this.disposed = true;
      this.unsubscribeAutosave();
      this.past = [];
      this.future = [];
      this.listeners.clear();
    }
  };
  function protectEditingDraft(needsWarning, host = window) {
    const handler = (event) => {
      if (needsWarning()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    host.addEventListener("beforeunload", handler);
    return () => host.removeEventListener("beforeunload", handler);
  }
  var editingStatus = (state, dirty) => state === "saving" ? "Saving" : state === "conflict" ? "Conflict" : state === "error" ? "Save Failed" : dirty ? "Unsaved" : "Saved";

  // src/client/artifact-editor/saved-source.ts
  var listeners3 = /* @__PURE__ */ new Set();
  function sourceSaved(url) {
    if (true) return;
    const match = /^\/api\/apps\/([^/]+)\/(visual-|composition-source|settings|presentation|artifacts)/.exec(url);
    if (match || url.startsWith("/api/automation/")) for (const listener of listeners3) listener(match && !url.includes("/visual-components") ? decodeURIComponent(match[1]) : void 0);
  }

  // src/client/artifact-editor/specialized-transport.ts
  async function specializedTransport(options, revoked) {
    let binding;
    let unsubscribe = () => {
    };
    if (false) {
      const session2 = await null;
      binding = session2.createEditorSessionBinding();
      try {
        await binding.headers();
      } catch (error) {
        binding.revoke();
        binding = void 0;
        if (error.code !== "editor.disabled") throw error;
      }
      if (binding) unsubscribe = session2.subscribeEditorSession(() => {
        try {
          binding.assert();
        } catch {
          revoked();
        }
      });
    }
    const request = options.request ?? (async (url, init) => {
      const headers = await binding?.headers();
      binding?.assert();
      const response = await fetch(url, { ...init, headers: { ...headers, ...options.applicationId ? { "x-editor-application-id": options.applicationId } : {}, ...init?.body instanceof FormData ? {} : { "content-type": "application/json" }, ...init?.headers } });
      const result = await response.json();
      binding?.assert();
      if (!response.ok) throw Object.assign(new Error(result.error ?? result.code ?? "Source request failed."), { status: response.status, code: result.code });
      if (init?.method === "PUT") sourceSaved(url);
      return result;
    });
    return { request, capture: options.captureRequest ?? (() => {
      binding?.assert();
      return request;
    }), dispose() {
      unsubscribe();
      binding?.revoke();
    } };
  }

  // src/client/visual-artifacts/authoring-controls.ts
  var el = (tag, text3) => {
    const node = document.createElement(tag);
    if (text3 !== void 0) node.textContent = text3;
    return node;
  };
  function textControl(parent, label, value = "") {
    const row = el("label", label), input2 = el("input");
    input2.value = value;
    input2.setAttribute("aria-label", label);
    row.append(input2);
    parent.append(row);
    return input2;
  }
  function choice(parent, label, values, value) {
    const row = el("label", label), input2 = el("select");
    input2.setAttribute("aria-label", label);
    values.forEach(([key, name]) => input2.add(new Option(name, key)));
    if (value !== void 0) input2.value = value;
    row.append(input2);
    parent.append(row);
    return input2;
  }
  function button(parent, label, run, error) {
    const node = el("button", label);
    node.type = "button";
    node.onclick = () => {
      void Promise.resolve().then(run).catch(error);
    };
    parent.append(node);
    return node;
  }
  function valueControls(parent, label, value, change, depth = 0) {
    const type = Array.isArray(value) ? "array" : value === null || value === void 0 ? "string" : typeof value;
    if (type === "object" || type === "array") {
      if (depth > 8) {
        parent.append(el("p", `${label}: nested value exceeds the supported authoring depth.`));
        return;
      }
      const group = el("fieldset");
      group.append(el("legend", label));
      parent.append(group);
      const current2 = value;
      for (const [key, item] of Object.entries(current2)) valueControls(group, `${label}.${key}`, item, (next) => {
        const copy2 = structuredClone(value);
        copy2[key] = next;
        change(copy2);
      }, depth + 1);
      const name = type === "object" ? textControl(group, `${label} member name`) : void 0;
      const kind = choice(group, `${label} member type`, ["string", "number", "boolean", "object", "array"].map((v) => [v, v]));
      button(group, `Add ${label} member`, () => {
        const key = name?.value ?? String(value.length);
        if (!/^[A-Za-z][\w]*$/.test(key) && type === "object" || ["__proto__", "prototype", "constructor"].includes(key) || Object.hasOwn(current2, key)) throw new Error("Choose a new ordinary member name.");
        const item = kind.value === "number" ? 0 : kind.value === "boolean" ? false : kind.value === "object" ? {} : kind.value === "array" ? [] : "";
        const copy2 = structuredClone(value);
        copy2[key] = item;
        change(copy2);
      }, (cause) => group.append(el("p", String(cause))));
      return;
    }
    const input2 = textControl(parent, label, String(value ?? ""));
    input2.type = type === "boolean" ? "checkbox" : type === "number" ? "number" : "text";
    input2.checked = value === true;
    input2.onchange = () => change(type === "boolean" ? input2.checked : type === "number" ? Number(input2.value) : input2.value);
  }
  function expressionControl(parent, label, initial) {
    const group = el("fieldset");
    group.append(el("legend", label));
    parent.append(group);
    const mode = choice(group, `${label} source`, [["path", "Named source path"], ["string", "Literal text"], ["number", "Literal number"], ["boolean", "Literal boolean"]], typeof initial === "string" || !initial ? "path" : "literal" in initial ? typeof initial.literal : "path");
    const input2 = textControl(group, `${label} value`, typeof initial === "string" ? initial : initial && "literal" in initial ? String(initial.literal) : "route.id");
    return () => mode.value === "path" ? input2.value : { literal: mode.value === "number" ? Number(input2.value) : mode.value === "boolean" ? input2.value === "true" : input2.value };
  }
  function compositionAuthoring(parent, options) {
    const { metadata, node, change, error } = options;
    if (!node) {
      const name = textControl(parent, "Artifact display name", metadata.displayName);
      name.onchange = () => change((m) => {
        m.displayName = name.value;
      });
      if (metadata.kind === "page") {
        const route = textControl(parent, "Page route", metadata.route);
        route.onchange = () => change((m) => {
          m.route = route.value;
        });
      }
      const group = el("fieldset");
      group.append(el("legend", "Local state"));
      parent.append(group);
      for (const [key, value] of Object.entries(metadata.state ?? {})) valueControls(group, `State ${key}`, value, (next) => change((m) => {
        m.state[key] = next;
      }));
      const state = textControl(group, "New local state");
      const stateType = choice(group, "New local state type", ["result", "string", "number", "boolean", "object", "array"].map((value) => [value, value]));
      button(group, "Declare local state", () => {
        if (!/^[A-Za-z][\w]*$/.test(state.value) || ["constructor", "prototype", "__proto__"].includes(state.value) || Object.hasOwn(metadata.state ?? {}, state.value)) throw new Error("Choose a new local state name.");
        change((m) => {
          (m.state ??= {})[state.value] = stateType.value === "object" ? {} : stateType.value === "array" ? [] : stateType.value === "number" ? 0 : stateType.value === "boolean" ? false : stateType.value === "string" ? "" : null;
        });
      }, error);
      if (metadata.kind !== "page") publicControls(parent, metadata.public, change, error);
      return;
    }
    if (options.slot) {
      const slot = choice(parent, "Instance child slot", [["", "Unassigned"], ...options.slot.choices.map((v) => [v, v])], options.slot.value);
      slot.onchange = () => options.slot.change(slot.value);
    }
    if (options.slots?.length) parent.append(el("p", `Declared slots: ${options.slots.join(", ")}. Insert a child and assign its slot.`));
    const binding = el("fieldset");
    binding.append(el("legend", "Instance binding"));
    parent.append(binding);
    const targets = options.bindingTargets ?? ["text"];
    const target = choice(binding, "Binding target", targets.map((v) => [v, v]));
    const expr = expressionControl(binding, "Binding");
    button(binding, "Apply binding", () => change((m) => {
      m.bindings = [...(m.bindings ?? []).filter((item) => !(item.node === node && item.target === target.value)), { node, target: target.value, value: expr() }];
    }), error);
    for (const existing of metadata.bindings?.filter((item) => item.node === node) ?? []) {
      const row = el("p", `${existing.target}: ${typeof existing.value === "string" ? existing.value : "declarative expression"}`);
      binding.append(row);
      button(row, `Remove binding ${existing.target}`, () => change((m) => {
        m.bindings = m.bindings?.filter((item) => item !== m.bindings?.find((candidate) => candidate.node === node && candidate.target === existing.target));
      }), error);
    }
    const events = el("fieldset");
    events.append(el("legend", "Event action"));
    parent.append(events);
    if (!options.events?.length) {
      events.append(el("p", "No public event metadata is declared for this Component."));
      return;
    }
    const draft = options.draft ?? {};
    const event = choice(events, "Action event", options.events.map((v) => [v, v]), draft.event);
    event.onchange = () => {
      draft.event = event.value;
    };
    const kind = choice(events, "Action kind", [["navigate", "Navigate"], ["set", "Set local state"], ["emit", "Emit public event"], ["service", "Existing Dataset service"], ["record-delete", "Protected single-record delete"], ["workflow", "Run approved Workflow"]], draft.kind);
    const details = el("div");
    events.append(details);
    const render2 = () => {
      details.replaceChildren();
      const add = (action) => button(details, "Add event action", () => change((m) => {
        const declaration = m.events?.find((item) => item.node === node && item.event === event.value);
        if (declaration) declaration.actions.push(action());
        else (m.events ??= []).push({ node, event: event.value, actions: [action()] });
      }), error);
      if (kind.value === "workflow") {
        const selected = choice(details, "Workflow", (draft.workflows ?? []).map((w) => [w.id, w.displayName]));
        const record2 = expressionControl(details, "Workflow record");
        const result = choice(details, "Workflow result state", Object.keys(metadata.state ?? {}).map((v) => [v, v]));
        details.append(el("p", "Result retains completedSteps, committedSteps, failedStep, failedActionId and serviceEffects. Bind these paths to visible text. Transport failure has an unknown outcome; never retry automatically."));
        button(details, "Load approved Workflows", async () => {
          if (!options.workflows) throw new Error("An Application-owned protected host is required.");
          draft.workflows = await options.workflows();
          options.refresh?.();
        }, error);
        add(() => {
          if (!selected.value || !result.value) throw new Error("Choose an approved Workflow and explicitly declared result state.");
          return { kind: "workflow", workflowId: selected.value, primaryRecordId: record2(), resultState: result.value };
        });
        return;
      }
      if (kind.value === "record-delete") {
        const explanation = el("p", "Resolve an applied Dataset and its permanent primary field. DOE enforces current permissions and record eligibility.");
        details.append(explanation);
        const renderTargets = (datasets) => {
          const selected = choice(details, "Delete Dataset", datasets.map((item) => [item.appliedSchema.dataset.id, item.name ?? item.appliedSchema.dataset.name]));
          const record2 = expressionControl(details, "Delete record");
          const result = choice(details, "Delete result state", Object.keys(metadata.state ?? {}).map((v) => [v, v]));
          add(() => {
            const schema = datasets.find((item) => item.appliedSchema.dataset.id === selected.value)?.appliedSchema;
            const primary = schema?.fields.filter((field) => field.type === "id");
            if (!schema || primary?.length !== 1 || !result.value) throw new Error("An applied Dataset with one declared primary identity and an explicit local result state are required.");
            return { kind: "record-delete", version: 1, datasetId: schema.dataset.id, primaryFieldId: primary[0].id, recordId: record2(), resultState: result.value };
          });
        };
        if (draft.datasets) renderTargets(draft.datasets);
        button(details, "Load applied delete targets", async () => {
          draft.datasets = (await options.datasets()).filter((item) => item.appliedSchema);
          options.refresh?.();
        }, error);
        return;
      }
      if (kind.value === "navigate") {
        const to = expressionControl(details, "Destination", { literal: "/" });
        add(() => ({ kind: "navigate", to: to() }));
      } else if (kind.value === "set") {
        const state = choice(details, "Action local state", Object.keys(metadata.state ?? {}).map((v) => [v, v]));
        const value = expressionControl(details, "Action value");
        add(() => {
          if (!state.value) throw new Error("Declare local state first.");
          return { kind: "set", state: state.value, value: value() };
        });
      } else if (kind.value === "service") {
        const reference = choice(details, "Existing service", [["dataset.read", "Protected Dataset read"], ["dataset.write", "Protected Dataset write"]]);
        const input2 = expressionControl(details, "Service input");
        add(() => ({ kind: "service", reference: reference.value, input: input2() }));
      } else {
        const emitted = choice(details, "Public event", Object.keys(metadata.public?.events ?? {}).map((v) => [v, v]));
        const payload = el("div");
        details.append(payload);
        let values = {};
        const refresh = () => {
          payload.replaceChildren();
          values = Object.fromEntries(Object.keys(metadata.public?.events[emitted.value]?.payload ?? {}).map((key) => [key, expressionControl(payload, `Payload ${key}`)]));
        };
        emitted.onchange = refresh;
        refresh();
        add(() => {
          if (!emitted.value) throw new Error("Declare a public event first.");
          return { kind: "emit", event: emitted.value, payload: Object.fromEntries(Object.entries(values).map(([key, get]) => [key, get()])) };
        });
      }
    };
    kind.onchange = () => {
      draft.kind = kind.value;
      render2();
    };
    render2();
    for (const declaration of metadata.events?.filter((item) => item.node === node) ?? []) declaration.actions.forEach((action, index) => {
      const row = el("p", `${declaration.event}: ${action.kind}`);
      events.append(row);
      button(row, `Remove ${declaration.event} action ${index + 1}`, () => change((m) => {
        const item = m.events.find((item2) => item2.node === node && item2.event === declaration.event);
        item.actions.splice(index, 1);
        if (!item.actions.length) m.events = m.events.filter((other) => other !== item);
      }), error);
    });
  }
  function publicControls(parent, api, change, error) {
    const group = el("fieldset");
    group.append(el("legend", "Shared public contract"));
    parent.append(group);
    const name = textControl(group, "Public member name");
    const kind = choice(group, "Public member kind", [["property", "Property"], ["event", "Event"], ["slot", "Slot"]]);
    const type = choice(group, "Public property type", ["string", "number", "boolean", "object", "array"].map((v) => [v, v]));
    const required = textControl(group, "Required public property");
    required.type = "checkbox";
    button(group, "Declare public member", () => {
      if (!/^[A-Za-z][\w]*$/.test(name.value) || ["constructor", "prototype", "__proto__"].includes(name.value)) throw new Error("Choose an ordinary public member name.");
      change((m) => {
        const target = m.public ??= { properties: {}, events: {}, slots: [] };
        if (kind.value === "slot") {
          if (target.slots.includes(name.value)) throw new Error("Slot already declared.");
          target.slots.push(name.value);
        } else if (kind.value === "event") {
          if (target.events[name.value]) throw new Error("Event already declared.");
          target.events[name.value] = { payload: {} };
        } else {
          if (target.properties[name.value]) throw new Error("Property already declared.");
          target.properties[name.value] = { type: type.value, required: required.checked, default: type.value === "object" ? {} : type.value === "array" ? [] : type.value === "boolean" ? false : type.value === "number" ? 0 : "" };
        }
      });
    }, error);
    for (const [key, contract] of Object.entries(api?.properties ?? {})) valueControls(group, `Public default ${key}`, contract.default, (value) => change((m) => {
      m.public.properties[key].default = value;
    }));
    for (const event of Object.keys(api?.events ?? {})) {
      const field = textControl(group, `${event} payload field`);
      const fieldType = choice(group, `${event} payload type`, ["string", "number", "boolean", "object", "array"].map((v) => [v, v]));
      button(group, `Add ${event} payload field`, () => {
        if (!/^[A-Za-z][\w]*$/.test(field.value) || ["constructor", "prototype", "__proto__"].includes(field.value)) throw new Error("Choose an ordinary payload field.");
        change((m) => {
          if (m.public.events[event].payload[field.value]) throw new Error("Payload field already declared.");
          m.public.events[event].payload[field.value] = { type: fieldType.value, required: true };
        });
      }, error);
    }
    group.append(el("p", `Slots: ${api?.slots.join(", ") || "none"}`));
  }

  // src/client/visual-artifacts/editor.ts
  var esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
  async function mountVisualEditor(target, appKey, options = {}) {
    const copies = /* @__PURE__ */ new Map();
    let copy2;
    const transport = await specializedTransport(options, () => {
      for (const item of copies.values()) item.lifecycle.suspend();
      target.hidden = true;
    });
    const request = transport.request;
    let active2 = !options.initial, disposed = false, operations = 0;
    const base = `/api/apps/${encodeURIComponent(appKey)}`;
    let workspace2, selected, selectedKind = "page";
    let files, baseline, hash = "", role = "source", selectedNode = "", conflict = false, saving = false;
    let preview, polling = false;
    const actionDrafts = /* @__PURE__ */ new Map();
    const readCardContext = () => {
      try {
        return options.savedCardContext?.get();
      } catch {
        return void 0;
      }
    };
    const originalCardContextKey = savedCardContextKey(readCardContext());
    let cardEpoch = 0, cardSelectionGeneration = 0, cardSourceGeneration = 0, cardPending = false, cardTerminal = false;
    const cardListeners = /* @__PURE__ */ new Set();
    const cardGenerations = () => ({ selection: cardSelectionGeneration, source: cardSourceGeneration });
    let cardValue = immutableSavedCard({ state: "unavailable", reason: "NO_SELECTION", generation: cardGenerations(), target: null });
    let cardCompletion;
    function publishCard(value) {
      cardValue = immutableSavedCard(value);
      for (const listener of [...cardListeners]) {
        if (cardValue !== value) break;
        if (!cardListeners.has(listener)) continue;
        try {
          listener(value);
        } catch {
        }
      }
    }
    function invalidateCard(reason, selection = false) {
      if (cardTerminal) return;
      cardEpoch++;
      if (selection) cardSelectionGeneration++;
      else cardSourceGeneration++;
      cardPending = false;
      cardCompletion = void 0;
      publishCard({ state: "unavailable", reason, generation: cardGenerations(), target: null });
    }
    function cardRefusal() {
      if (disposed || cardTerminal) return "DISPOSED";
      if (!originalCardContextKey) return "NO_CONTEXT";
      if (savedCardContextKey(readCardContext()) !== originalCardContextKey || readCardContext()?.applicationId !== options.applicationId) return "CONTEXT_CHANGED";
      if (copy2?.lifecycle.suspended) return "SUSPENDED";
      if (!active2 || !target.isConnected || target.hidden || document.visibilityState === "hidden") return "NOT_ACTIVE";
      if (!copy2 || selectedKind !== "page" || !selectedNode) return "NO_SELECTION";
      if (copy2.lifecycle.inFlight || copy2.lifecycle.state === "saving") return "SAVE_PENDING";
      if (copy2.lifecycle.state === "conflict") return "SOURCE_UNCERTAIN";
      if (copy2.lifecycle.failure || copy2.lifecycle.state === "error") return "SAVE_FAILED";
      if (copy2.lifecycle.dirty) return "DIRTY_DRAFT";
    }
    function cardSignature() {
      return JSON.stringify([
        savedCardContextKey(readCardContext()),
        selectedNode,
        copy2?.bundle,
        copy2?.lifecycle.baseline,
        copy2?.lifecycle.generation,
        copy2?.lifecycle.savedGeneration,
        copy2?.lifecycle.state,
        copy2?.lifecycle.dirty,
        workspace2.packages,
        workspace2.components.map((bundle) => bundle.metadata?.componentId)
      ]);
    }
    function evaluateCard() {
      if (cardTerminal) return;
      const refusal = cardRefusal();
      if (refusal) {
        publishCard({ state: "unavailable", reason: refusal, generation: cardGenerations(), target: null });
        return;
      }
      const epoch2 = cardEpoch, signature = cardSignature();
      cardPending = true;
      const input2 = structuredClone({
        context: readCardContext(),
        bundle: copy2.bundle,
        baseline: copy2.lifecycle.baseline,
        candidate: selectedNode,
        packages: workspace2.packages,
        componentIds: workspace2.components.map((bundle) => bundle.metadata?.componentId),
        generation: cardGenerations()
      });
      void identifyRetainedSavedCard(input2).then((value) => {
        if (cardTerminal || epoch2 !== cardEpoch) return;
        cardPending = false;
        if (cardRefusal() || signature !== cardSignature()) {
          invalidateCard("SOURCE_UNCERTAIN");
          return;
        }
        publishCard(value);
      });
    }
    const cardVisibility = () => invalidateCard("NOT_ACTIVE");
    function currentCardSnapshot() {
      const reason = cardRefusal();
      if ((cardValue.state === "identified" || cardPending) && reason) invalidateCard(reason);
      return cardValue;
    }
    const savedCardTarget = Object.freeze({
      get snapshot() {
        return currentCardSnapshot();
      },
      subscribe(listener) {
        const current2 = currentCardSnapshot();
        if (!cardTerminal) cardListeners.add(listener);
        try {
          listener(current2);
        } catch {
        }
        return () => {
          cardListeners.delete(listener);
        };
      }
    });
    const dirty = () => !!copy2?.lifecycle.dirty;
    const list = (kind) => kind === "page" ? workspace2.pages : kind === "shell" ? workspace2.shells : workspace2.components;
    const plural = (kind) => kind === "page" ? "pages" : kind === "shell" ? "shells" : "components";
    const url = () => `${base}/visual-${plural(selectedKind)}?locator=${encodeURIComponent(selected.locator)}`;
    target.innerHTML = `<div class="stack"><div class="pane-heading"><strong>Visual Artifacts</strong><span data-status aria-live="polite"></span></div>
    <div class="editor-actions"><button data-create="page">Create Page</button><button data-create="component">Create Platform Component</button><button data-create="form-dataset">Create Form from Dataset</button><button data-create="form">Create blank Form</button><select aria-label="Visual Artifact" data-artifacts><option value="">Select an artifact</option></select></div>
    <div data-work hidden><div class="editor-actions"><button data-undo>Undo</button><button data-redo>Redo</button><button data-save>Save Now</button><button data-repair>Advanced source repair save</button><button data-reload>Reload / discard editor changes</button><button data-recover>Download editor recovery</button><button data-delete>Delete artifact</button><button data-preview>Design preview</button><button data-change-shell>Change Page Shell</button><button data-add-region>Add Region</button><button data-remove-node>Remove selected node</button></div>
    <div data-diagnostics></div><div class="builder-layout" style="grid-template-columns:minmax(180px,1fr) minmax(220px,2fr)"><div class="stack"><strong>Structure</strong><select data-nodes size="8" aria-label="Visual node"></select>
    <label>Insert into selected HTML container, or artifact root<select data-insert aria-label="Insert element"></select></label><button data-add>Insert with layout wrapper</button><button data-root>Select artifact root</button><button data-move="up">Move layout item up</button><button data-move="down">Move layout item down</button><div data-inspector></div></div>
    <div class="stack"><label>Source file<select data-file aria-label="Visual source file">${["source", "css", "metadata", "fixtures", "code"].map((name) => `<option>${name}</option>`).join("")}</select></label><textarea data-source aria-label="Visual source" class="source-editor" spellcheck="false"></textarea><p class="note">Use the authoring controls for public settings, bindings, slots and events. Advanced source is preserved. Design preview does not persist data or run custom functions.</p></div></div><div data-preview-host></div></div></div>`;
    const find = (selector) => target.querySelector(selector);
    const status = (message) => {
      find("[data-status]").textContent = message;
      options.onStateChange?.();
    };
    const safe = (run) => async () => {
      if (disposed || !active2) return;
      operations++;
      try {
        await run();
      } catch (error) {
        status(error instanceof Error ? error.message : String(error));
      } finally {
        operations--;
        options.onStateChange?.();
      }
    };
    find('[data-create="page"]').insertAdjacentHTML("afterend", '<button data-create="shell">Create Shell</button>');
    find("[data-add-region]").insertAdjacentHTML("afterend", "<button data-place-menu>Place Application Menu</button>");
    find("[data-place-menu]").addEventListener("click", safe(async () => {
      const composition = await request(`${base}/composition`);
      const menuId = await chooseNamedValue("Application Menu", composition.menus.map((menu) => ({ value: menu.menuId, label: menu.name })));
      if (!menuId || !active2 || disposed) return;
      if (!composition.menus.some((menu) => menu.menuId === menuId)) throw new Error("Choose an Application Menu.");
      const wrapperId = `node_${crypto.randomUUID()}`, nodeId = `node_${crypto.randomUUID()}`, ids = [wrapperId, nodeId];
      files.source = insertNode(files.source, "nav", void 0, selectedNode || void 0, () => ids.shift());
      files.source = setNodeAttribute(files.source, nodeId, "data-uip-menu", menuId);
      files.source = setNodeAttribute(files.source, nodeId, "aria-label", composition.menus.find((menu) => menu.menuId === menuId).name);
      find("[data-source]").value = files[role];
      changed();
    }));
    find("[data-add-region]").addEventListener("click", safe(() => {
      const shell = selectedKind === "page" ? workspace2.shells.find((shell2) => shell2.metadata?.artifactId === workingMetadata().shellId) : void 0;
      const choices = shell ? regions(shell.files.source).map((region) => region.regionId) : [...recommendedRegionIds];
      const id = prompt("Region ID (stable; custom region- IDs allowed in Shells):\n" + choices.join("\n"), choices[0]);
      if (!id) return;
      if (shell && !choices.includes(id)) throw new Error("Choose a Region from the Page Shell.");
      if (regions(files.source).some((region) => region.regionId === id)) throw new Error("Region already exists.");
      const name = prompt("Region display name:", id);
      if (name === null) return;
      files.source += `
<section class="uip-layout-item" data-uip-node="node_${crypto.randomUUID()}" data-uip-region="${esc(id)}" data-uip-region-name="${esc(name)}"></section>
`;
      regions(files.source);
      find("[data-source]").value = files[role];
      changed();
    }));
    find("[data-remove-node]").addEventListener("click", safe(() => {
      const node = parseSource(files.source).nodes.find((node2) => node2.id === selectedNode);
      if (!node) throw new Error("Select a Page-owned or Shell-owned node.");
      if (!confirm("Remove selected node and its children? Removing a Page Region restores the Shell default; keeping an empty Region suppresses it.")) return;
      files.source = files.source.slice(0, node.start) + files.source.slice(node.end);
      selectedNode = "";
      find("[data-source]").value = files[role];
      changed();
    }));
    find("[data-change-shell]").addEventListener("click", safe(async () => {
      if (dirty() || conflict) throw new Error("Save or recover changes before changing Shell.");
      const shellId = prompt("New Shell ID:\n" + workspace2.shells.map((shell2) => `${shell2.metadata?.displayName}: ${shell2.metadata?.artifactId}`).join("\n"));
      if (!shellId) return;
      const shell = workspace2.shells.find((shell2) => shell2.metadata?.artifactId === shellId);
      if (!shell) throw new Error("Shell is missing.");
      const available = regions(shell.files.source).map((region) => region.regionId), decisions = {};
      for (const region of regions(files.source)) if (!available.includes(region.regionId)) {
        const mapping = prompt(`Map ${region.regionId} to one of:
${available.join("\n")}
Type DISCARD to explicitly discard this Region. Cancel keeps the current Shell.`);
        if (mapping === null) return;
        decisions[region.regionId] = mapping === "DISCARD" ? null : mapping;
      }
      const bundle = await request(`${base}/page-shell`, { method: "POST", body: JSON.stringify({ locator: selected.locator, shellId, decisions, expectedHash: hash }) });
      workspace2 = await request(`${base}/visual-artifacts`);
      open(bundle, "page");
    }));
    function renderList() {
      find('[data-create="shell"]').hidden = !workspace2.shells?.length;
      const select = find("[data-artifacts]");
      select.innerHTML = '<option value="">Select an artifact</option>' + [["Pages", workspace2.pages], ["Shells", workspace2.shells ?? []], ["Platform Components", workspace2.components]].map(([label, items]) => `<optgroup label="${label}">${items.map((b) => `<option value="${label === "Pages" ? "page" : label === "Shells" ? "shell" : "component"}:${esc(b.locator)}">${esc(b.metadata?.displayName ?? b.locator)}${b.diagnostics.some((d) => d.severity === "error") ? " (needs repair)" : ""}</option>`).join("")}</optgroup>`).join("");
      if (selected) select.value = `${selectedKind}:${selected.locator}`;
      find("[data-insert]").innerHTML = '<optgroup label="HTML">' + ["section", "div", "article", "p", "h2", "a", "button", "img", "ul", "li", "span", "uip-slot"].map((tag) => `<option value="html:${tag}">${tag}</option>`).join("") + '</optgroup><optgroup label="Package Components">' + workspace2.packages.filter((p) => !p.activationIssues?.length).map((p) => `<option value="package:${esc(p.id)}">${esc(p.name ?? p.tagName)}</option>`).join("") + '</optgroup><optgroup label="Platform Components">' + workspace2.components.filter((b) => b.metadata && !b.diagnostics.some((d) => d.severity === "error")).map((b) => `<option value="component:${esc(b.metadata.componentId)}">${esc(b.metadata.displayName)}</option>`).join("") + "</optgroup>";
    }
    function workingMetadata() {
      const metadata = parseMetadata(files.metadata).metadata;
      if (!metadata) throw new Error("Repair metadata JSON first.");
      return metadata;
    }
    function changeMetadata(change) {
      const metadata = workingMetadata();
      change(metadata);
      files.metadata = JSON.stringify(metadata, null, 2) + "\n";
      changed();
    }
    function paintState() {
      const lifecycle = copy2?.lifecycle;
      conflict = lifecycle?.state === "conflict";
      saving = lifecycle?.state === "saving";
      status(lifecycle ? [editingStatus(lifecycle.state, lifecycle.dirty), lifecycle.failure, lifecycle.notice].filter(Boolean).join(" \xB7 ") : "Select an artifact");
      find("[data-save]").disabled = conflict || !lifecycle?.dirty;
      find("[data-undo]").disabled = !lifecycle?.canUndo;
      find("[data-redo]").disabled = !lifecycle?.canRedo;
    }
    function changed(group) {
      invalidateCard("SOURCE_CHANGED");
      if (copy2 && JSON.stringify(files) !== JSON.stringify(copy2.lifecycle.current)) {
        copy2.saveRequest = transport.capture();
        copy2.lifecycle.edit(files, group);
      }
      paintState();
      if (role !== "source") find("[data-source]").value = files[role];
      try {
        renderStructure();
      } catch {
        status("Invalid local source retained. Repair source before using structured controls.");
      }
    }
    function renderStructure() {
      const parsed = parseSource(files.source);
      const selector = find("[data-nodes]");
      const shell = selectedKind === "page" ? workspace2.shells?.find((shell2) => shell2.metadata?.artifactId === workingMetadata().shellId) : void 0;
      selector.innerHTML = (shell ? '<optgroup label="Shell context \u2014 locked; edit the Shell">' + parseSource(shell.files.source).nodes.filter((n) => !n.attributes["data-uip-region"]).map((n) => `<option disabled>\u{1F512} ${esc(n.tag + " " + (n.id ?? ""))}</option>`).join("") + "</optgroup>" : "") + parsed.nodes.map((n, index) => `<option value="${esc(n.id ?? `manual:${index}`)}">${esc(`${n.attributes["data-uip-region"] ?? n.tag} ${n.attributes["data-uip-region-name"] ?? n.id ?? "(manual)"}`)}</option>`).join("");
      selector.value = selectedNode;
      find("[data-diagnostics]").innerHTML = [...selected?.diagnostics ?? [], ...parsed.diagnostics].map((d) => `<p class="${d.severity === "error" ? "error" : "note"}">${esc(d.message)}</p>`).join("");
      renderInspector();
    }
    function renderInspector() {
      const inspector = find("[data-inspector]");
      const parsed = parseSource(files.source);
      const node = parsed.nodes.find((n) => n.id === selectedNode);
      inspector.innerHTML = "";
      const definitionId = node?.attributes["data-uip-component"];
      if (definitionId && workspace2.components.some((component2) => component2.metadata?.componentId === definitionId) && options.onDefinition) {
        const edit = document.createElement("button");
        edit.textContent = "Edit Definition";
        edit.onclick = () => options.onDefinition(definitionId);
        inspector.append(edit);
      }
      if (!node) {
        inspector.innerHTML = '<p class="note">Select a managed node to edit settings and bindings.</p>';
        const metadata = workingMetadata();
        compositionAuthoring(inspector, { metadata, change: changeMetadata, workflows: async () => (await request(`${base}/automation-catalog`)).workflows, datasets: () => request(`${base}/datasets/discovery`), error: (cause) => status(String(cause)) });
        if (selectedKind === "page" && metadata.shellId) {
          const note = document.createElement("p");
          note.textContent = `Shell: ${workspace2.shells.find((shell) => shell.metadata?.artifactId === metadata.shellId)?.metadata?.displayName ?? metadata.shellId}. Fixed content is edited in the Shell editor.`;
          inspector.append(note);
          const override = document.createElement("button");
          override.textContent = "Set Page Menu Item visibility / availability";
          override.addEventListener("click", safe(() => {
            const menuId = prompt("Application Menu ID:");
            if (!menuId) return;
            const itemId = prompt("Existing Menu Item ID:");
            if (!itemId) return;
            const setting = prompt("Override: hidden or disabled", "hidden");
            if (!setting || !["hidden", "disabled"].includes(setting)) return;
            const value = prompt("true or false", "true");
            if (value !== "true" && value !== "false") return;
            changeMetadata((metadata2) => {
              metadata2.menuOverrides ??= {};
              const menu = metadata2.menuOverrides[menuId] ??= {};
              menu.items ??= {};
              menu.items[itemId] ??= {};
              Object.assign(menu.items[itemId], { [setting]: value === "true" });
            });
          }));
          inspector.append(override);
          const local = document.createElement("button");
          local.textContent = "Add Page-local Menu Item";
          local.addEventListener("click", safe(() => {
            const menuId = prompt("Application Menu ID:");
            if (!menuId) return;
            const label = prompt("Page-local item label:");
            if (!label) return;
            const destination = prompt("Destination JSON:", '{"kind":"page","pageId":"' + metadata.artifactId + '"}');
            if (!destination) return;
            const parentItemId = prompt("Parent Menu Item ID (empty for root):", "");
            if (parentItemId === null) return;
            const item = { itemId: `local-${crypto.randomUUID()}`, label, destination: JSON.parse(destination) };
            changeMetadata((metadata2) => {
              metadata2.menuOverrides ??= {};
              const menu = metadata2.menuOverrides[menuId] ??= {};
              (menu.additions ??= []).push({ ...parentItemId ? { parentItemId } : {}, item });
            });
          }));
          inspector.append(local);
        }
        if (metadata.form) {
          for (const [labelText, value, change] of [
            ["Dataset target", metadata.form.datasetId, (m, v) => {
              m.form.datasetId = v;
            }],
            ["Submit service", metadata.form.submit.service, (m, v) => {
              m.form.submit.service = v;
            }],
            ["Read service", metadata.form.submit.readService, (m, v) => {
              m.form.submit.readService = v;
            }],
            ["Default mode", metadata.modes.default, (m, v) => {
              m.modes.default = v;
              m.modes.overrides[v] ??= {};
              m.public.properties.mode.default = v;
            }]
          ]) {
            const label = document.createElement("label");
            label.textContent = labelText;
            const input2 = document.createElement("input");
            input2.value = value;
            input2.setAttribute("aria-label", labelText);
            input2.addEventListener("change", safe(() => changeMetadata((m) => change(m, input2.value))));
            label.append(input2);
            inspector.append(label);
          }
          const addMode = document.createElement("button");
          addMode.textContent = "Add mode";
          addMode.addEventListener("click", safe(() => {
            const name = prompt("Mode name:");
            if (name) changeMetadata((m) => {
              m.modes.overrides[name] ??= {};
            });
          }));
          inspector.append(addMode);
        }
        return;
      }
      if (node.manual) {
        inspector.textContent = "Manual region: edit source directly.";
        return;
      }
      const classLabel = document.createElement("label");
      classLabel.textContent = "CSS classes";
      const classInput = document.createElement("input");
      classInput.value = node.attributes.class ?? "";
      classInput.addEventListener("change", safe(() => {
        files.source = setNodeAttribute(files.source, selectedNode, "class", classInput.value);
        find("[data-source]").value = files[role];
        changed();
      }));
      classLabel.append(classInput);
      inspector.append(classLabel);
      if (selectedKind === "shell" && ["img", "strong", "span", "p", "h1", "h2", "h3"].includes(node.tag)) {
        const label = document.createElement("label");
        label.textContent = "Application branding";
        const select = document.createElement("select");
        select.setAttribute("aria-label", "Application branding");
        for (const key of ["", ...node.tag === "img" ? ["primaryLogo", "secondaryLogo", "favicon"] : ["applicationName", "shortName"]]) select.add(new Option(key || "No branding binding", key));
        select.value = node.attributes["data-uip-branding"] ?? "";
        select.onchange = safe(() => {
          files.source = setNodeAttribute(files.source, selectedNode, "data-uip-branding", select.value);
          find("[data-source]").value = files[role];
          changed();
        });
        label.append(select);
        inspector.append(label);
      }
      if (node.attributes["data-uip-region"]) {
        const label = document.createElement("label");
        label.textContent = "Region display name (stable ID unchanged)";
        const input2 = document.createElement("input");
        input2.value = node.attributes["data-uip-region-name"] ?? node.attributes["data-uip-region"];
        input2.addEventListener("change", safe(() => {
          files.source = setNodeAttribute(files.source, selectedNode, "data-uip-region-name", input2.value);
          find("[data-source]").value = files[role];
          changed();
        }));
        label.append(input2);
        inspector.append(label);
      }
      const field = workingMetadata().form?.fields.find((f) => f.node === selectedNode);
      if (field) {
        const mode = document.createElement("select");
        mode.setAttribute("aria-label", "Field override mode");
        for (const name of ["base", ...Object.keys(workingMetadata().modes.overrides)]) {
          const option = document.createElement("option");
          option.textContent = name;
          mode.append(option);
        }
        inspector.append(mode);
        for (const key of ["label", "help", "visible", "editable", "required"]) {
          const label = document.createElement("label");
          label.textContent = `Field ${key}`;
          const input2 = document.createElement("input");
          input2.type = ["visible", "editable", "required"].includes(key) ? "checkbox" : "text";
          const refresh2 = () => {
            const m = workingMetadata();
            const value = mode.value === "base" ? field[key] : m.modes.overrides[mode.value][field.node]?.[key] ?? field[key];
            input2.value = String(value ?? "");
            input2.checked = value !== false && (key !== "required" || Boolean(value));
          };
          refresh2();
          mode.addEventListener("change", refresh2);
          input2.setAttribute("aria-label", `Field ${key}`);
          input2.addEventListener("change", safe(() => changeMetadata((m) => {
            const target2 = mode.value === "base" ? m.form.fields.find((f) => f.id === field.id) : m.modes.overrides[mode.value][field.node] ??= {};
            Object.assign(target2, { [key]: input2.type === "checkbox" ? input2.checked : input2.value });
          })));
          label.append(input2);
          inspector.append(label);
        }
      }
      const pkg = workspace2.packages.find((p) => p.id === node.attributes["data-uip-component"]);
      const component = workspace2.components.find((c) => c.metadata?.componentId === node.attributes["data-uip-component"]);
      const contracts = pkg?.definition?.builder.settings ?? (pkg ? legacyPackageSettingContracts(pkg) : component?.metadata?.public?.properties ?? {});
      let settings;
      try {
        settings = JSON.parse(node.attributes["data-uip-settings"] ?? "{}");
      } catch {
        inspector.textContent = "Repair settings JSON in source first.";
        return;
      }
      if (pkg?.definition) settings = readPackageSettings(pkg.definition, node.attributes, settings);
      if (pkg && !pkg.definition) {
        inspector.append(Object.assign(document.createElement("p"), { textContent: "Legacy package metadata: only declared attributes/properties are configurable. Typed public slots/events are unavailable unless explicitly declared." }));
        const unavailable = Object.keys(pkg.presentation?.settings ?? {}).filter((key) => !contracts[key]);
        if (unavailable.length) inspector.append(Object.assign(document.createElement("p"), { textContent: `No declared direct instance mapping: ${unavailable.join(", ")}. These presentation record fields are unavailable here; no attribute conversion is inferred.` }));
        for (const key of /* @__PURE__ */ new Set([...pkg.attributes ?? [], ...pkg.properties ?? []])) {
          if (contracts[key]) continue;
          const label = document.createElement("label");
          label.textContent = key;
          const input2 = document.createElement("input");
          input2.setAttribute("aria-label", `Setting ${key}`);
          input2.value = String(settings[key] ?? node.attributes[key] ?? "");
          input2.onchange = safe(() => {
            settings[key] = input2.value;
            files.source = setNodeAttribute(files.source, selectedNode, "data-uip-settings", JSON.stringify(settings));
            changed();
          });
          label.append(input2);
          inspector.append(label);
        }
      }
      for (const [key, contract] of Object.entries(contracts)) {
        const packageSetting = pkg?.definition?.builder.settings[key];
        if (packageSetting?.binding?.kind === "event") {
          inspector.append(Object.assign(document.createElement("p"), { textContent: `${key}: registered handler selection is unavailable in this host. Use the declared public event action controls.` }));
          continue;
        }
        if (packageSetting?.visibleWhen && (settings[packageSetting.visibleWhen.setting] ?? contracts[packageSetting.visibleWhen.setting]?.default) !== packageSetting.visibleWhen.equals) continue;
        if (contract.type === "object" || contract.type === "array") {
          valueControls(inspector, `Setting ${key}`, settings[key] ?? contract.default ?? (contract.type === "array" ? [] : {}), (value2) => {
            settings[key] = value2;
            files.source = setNodeAttribute(files.source, selectedNode, "data-uip-settings", JSON.stringify(settings));
            changed();
          });
          continue;
        }
        const label = document.createElement("label");
        label.textContent = key;
        const values = key === "mode" && component?.metadata?.modes ? Object.keys(component.metadata.modes.overrides) : contract.enum;
        const input2 = values ? document.createElement("select") : document.createElement("input");
        if (input2 instanceof HTMLSelectElement) values.forEach((value2) => {
          const option = document.createElement("option");
          option.value = JSON.stringify(value2);
          option.textContent = String(value2);
          input2.append(option);
        });
        if (input2 instanceof HTMLInputElement) input2.type = contract.type === "boolean" ? "checkbox" : contract.type === "number" ? "number" : "text";
        const value = settings[key] ?? contract.default;
        if (input2 instanceof HTMLSelectElement) input2.value = JSON.stringify(value);
        else if (input2.type === "checkbox") input2.checked = Boolean(value);
        else input2.value = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
        input2.setAttribute("aria-label", `Setting ${key}`);
        input2.addEventListener("change", safe(() => {
          settings[key] = input2 instanceof HTMLSelectElement ? JSON.parse(input2.value) : input2.type === "checkbox" ? input2.checked : input2.type === "number" ? Number(input2.value) : ["object", "array"].includes(contract.type) ? JSON.parse(input2.value) : input2.value;
          for (const [name, item] of Object.entries(pkg?.definition?.builder.settings ?? {})) if (item.visibleWhen && (settings[item.visibleWhen.setting] ?? pkg.definition.builder.settings[item.visibleWhen.setting].default) !== item.visibleWhen.equals) settings[name] = item.default;
          files.source = setNodeAttribute(files.source, selectedNode, "data-uip-settings", JSON.stringify(settings));
          find("[data-source]").value = files[role];
          changed();
        }));
        label.append(input2);
        inspector.append(label);
      }
      if (!node.attributes["data-uip-component"] && !isWrapper(node)) {
        const label = document.createElement("label");
        label.textContent = "Text content";
        const input2 = document.createElement("input");
        input2.value = files.source.slice(node.openEnd, node.closeStart);
        input2.addEventListener("change", safe(() => {
          if (node.children.length) throw new Error("Edit nested content in source or select a leaf.");
          files.source = files.source.slice(0, node.openEnd) + esc(input2.value) + files.source.slice(node.closeStart);
          find("[data-source]").value = files[role];
          changed();
        }));
        label.append(input2);
        inspector.append(label);
      }
      let slotChild = node, ancestor = node.parent;
      while (ancestor && !ancestor.attributes["data-uip-component"]) {
        slotChild = ancestor;
        ancestor = ancestor.parent;
      }
      const parentComponent = workspace2.components.find((item) => item.metadata?.componentId === ancestor?.attributes["data-uip-component"]);
      const parentPackage = workspace2.packages.find((item) => item.id === ancestor?.attributes["data-uip-component"]);
      const slots = component?.metadata?.public?.slots ?? pkg?.definition?.runtime.slots.map((slot) => slot.name) ?? pkg?.slots;
      const parentSlots = parentComponent?.metadata?.public?.slots ?? parentPackage?.definition?.runtime.slots.map((slot) => slot.name) ?? parentPackage?.slots;
      compositionAuthoring(inspector, {
        metadata: workingMetadata(),
        node: selectedNode,
        change: changeMetadata,
        slots,
        draft: actionDrafts.get(selectedNode) ?? (() => {
          const draft = {};
          actionDrafts.set(selectedNode, draft);
          return draft;
        })(),
        refresh: () => {
          if (active2 && !disposed) renderInspector();
        },
        bindingTargets: component ? Object.keys(contracts).map((key) => `property:${key}`) : pkg?.definition ? Object.keys(contracts).filter((key) => contracts[key] && pkg.definition.builder.settings[key].binding?.kind !== "event").map((key) => `setting:${key}`) : pkg ? [.../* @__PURE__ */ new Set([...pkg.attributes ?? [], ...Object.keys(contracts)])].map((key) => `attribute:${key}`) : ["text", "attribute:href", "attribute:aria-label", "property:disabled"],
        events: component ? Object.keys(component.metadata.public?.events ?? {}) : pkg ? Object.keys(pkg.definition?.runtime.events ?? {}).concat(pkg.events ?? []) : ["click", "change", "input", "submit"],
        ...parentSlots && slotChild.id ? { slot: { value: slotChild.attributes.slot || (parentPackage ? "default" : ""), choices: parentSlots, change: (value) => {
          files.source = setNodeAttribute(files.source, slotChild.id, "slot", parentPackage && value === "default" ? "" : value);
          changed();
        } } } : {},
        workflows: async () => (await request(`${base}/automation-catalog`)).workflows,
        datasets: () => request(`${base}/datasets/discovery`),
        error: (cause) => status(String(cause))
      });
      if (node.tag === "uip-slot") {
        const label = document.createElement("label");
        label.textContent = "Public slot outlet";
        const slot = document.createElement("select");
        slot.setAttribute("aria-label", "Public slot outlet");
        for (const name of workingMetadata().public?.slots ?? []) slot.add(new Option(name, name));
        slot.value = node.attributes.name ?? "";
        slot.onchange = safe(() => {
          files.source = setNodeAttribute(files.source, selectedNode, "name", slot.value);
          changed();
        });
        label.append(slot);
        inspector.append(label);
      }
      const wrapper = isWrapper(node) ? node : isWrapper(node.parent) ? node.parent : void 0;
      if (!wrapper?.id) {
        inspector.insertAdjacentHTML("beforeend", '<p class="note">Layout is manual for this node.</p>');
        return;
      }
      inspector.insertAdjacentHTML("beforeend", "<label>Breakpoint<select data-breakpoint><option>base</option><option>tablet</option><option>mobile</option></select></label><div data-layout></div>");
      const renderLayout = () => {
        const breakpoint = inspector.querySelector("[data-breakpoint]").value;
        const layout = workingMetadata().layout?.[wrapper.id]?.[breakpoint] ?? {};
        const container = inspector.querySelector("[data-layout]");
        container.replaceChildren();
        for (const key of ["width", "height", "margin", "padding", "display", "gridTemplateColumns", "gridColumn", "gap", "alignItems", "justifyContent", "flexDirection"]) {
          const label = document.createElement("label");
          label.textContent = key;
          const input2 = document.createElement("input");
          input2.value = String(layout[key] ?? "");
          input2.setAttribute("aria-label", `Layout ${breakpoint} ${key}`);
          input2.addEventListener("change", safe(() => changeMetadata((m) => {
            m.layout ??= {};
            m.layout[wrapper.id] ??= {};
            m.layout[wrapper.id][breakpoint] ??= {};
            const values = m.layout[wrapper.id][breakpoint];
            if (input2.value) values[key] = input2.value;
            else delete values[key];
          })));
          label.append(input2);
          container.append(label);
        }
      };
      inspector.querySelector("[data-breakpoint]").addEventListener("change", renderLayout);
      renderLayout();
    }
    function open(bundle, kind, replace = false) {
      invalidateCard("SOURCE_CHANGED");
      bundle = structuredClone(bundle);
      const key = `${kind}:${bundle.locator}`;
      let retained = copies.get(key);
      if (!retained) {
        const record2 = { bundle, kind, lifecycle: void 0, saveRequest: void 0 };
        record2.lifecycle = new EditingLifecycle(bundle.files, async (candidate) => {
          const authorized = record2.saveRequest;
          if (!authorized) throw new Error("The original authorized editing context is required.");
          const stamp = { record: record2, epoch: cardEpoch, selection: cardSelectionGeneration, context: savedCardContextKey(readCardContext()), editing: record2.lifecycle.generation };
          const saved = await authorized(`${base}/visual-${plural(record2.kind)}?locator=${encodeURIComponent(record2.bundle.locator)}`, { method: "PUT", body: JSON.stringify({ mode: "normal", files: candidate, expectedHash: record2.bundle.hash }) });
          record2.bundle = structuredClone(saved);
          if (!cardTerminal && stamp.epoch === cardEpoch && stamp.selection === cardSelectionGeneration && stamp.context === savedCardContextKey(readCardContext())) cardCompletion = stamp;
          return saved.files;
        });
        record2.lifecycle.subscribe(() => {
          const completion = cardCompletion;
          const completed = copy2 === record2 && completion?.record === record2 && completion.epoch === cardEpoch && completion.selection === cardSelectionGeneration && completion.context === savedCardContextKey(readCardContext()) && completion.editing === record2.lifecycle.generation && record2.lifecycle.savedGeneration === record2.lifecycle.generation && !record2.lifecycle.inFlight && !record2.lifecycle.dirty && record2.lifecycle.state === "saved" && !record2.lifecycle.failure;
          invalidateCard(record2.lifecycle.suspended ? "SUSPENDED" : record2.lifecycle.state === "saving" ? "SAVE_PENDING" : record2.lifecycle.failure ? "SAVE_FAILED" : "SOURCE_CHANGED");
          if (copy2 === record2) {
            const changedSource = JSON.stringify(files) !== JSON.stringify(record2.lifecycle.current);
            files = structuredClone(record2.lifecycle.current);
            baseline = structuredClone(record2.lifecycle.baseline);
            selected = record2.bundle;
            hash = record2.bundle.hash;
            if (changedSource) {
              find("[data-source]").value = files[role];
              try {
                renderStructure();
              } catch {
              }
            }
            paintState();
          } else options.onStateChange?.();
          if (completed) evaluateCard();
        });
        copies.set(key, record2);
        retained = record2;
      } else if (!retained.lifecycle.inFlight) {
        if (replace || bundle.hash !== retained.bundle.hash && !retained.lifecycle.dirty) {
          retained.bundle = bundle;
          retained.lifecycle.reset(bundle.files);
        } else if (bundle.hash !== retained.bundle.hash) retained.lifecycle.conflict();
      }
      copy2 = retained;
      selected = retained.bundle;
      selectedKind = kind;
      files = structuredClone(retained.lifecycle.current);
      baseline = structuredClone(retained.lifecycle.baseline);
      hash = retained.bundle.hash;
      conflict = retained.lifecycle.state === "conflict";
      selectedNode = "";
      role = "source";
      find("[data-work]").hidden = false;
      find("[data-file]").value = role;
      find("[data-source]").value = files.source;
      renderList();
      changed();
      find("[data-change-shell]").hidden = kind !== "page" || !bundle.metadata?.shellId;
      find("[data-add-region]").hidden = kind === "component" || kind === "page" && !bundle.metadata?.shellId;
      find("[data-place-menu]").hidden = kind !== "shell";
      if (kind === "page" && bundle.metadata?.shellId) void showPreview();
    }
    let selectionGeneration = 0;
    find("[data-artifacts]").addEventListener("change", safe(async () => {
      const generation = ++selectionGeneration;
      const [kind, ...path] = find("[data-artifacts]").value.split(":");
      const locator = path.join(":");
      if (!list(kind).some((bundle2) => bundle2.locator === locator)) return;
      const bundle = await request(`${base}/visual-${plural(kind)}?locator=${encodeURIComponent(locator)}`);
      if (generation === selectionGeneration && active2 && !disposed) open(bundle, kind);
    }));
    target.querySelectorAll("[data-create]").forEach((button2) => button2.addEventListener("click", safe(async () => {
      if (dirty()) throw new Error("Save or recover editor changes before creating another artifact.");
      const name = prompt("Artifact name (lowercase-with-hyphens):");
      if (!name) return;
      const isForm = button2.dataset.create.startsWith("form");
      const kind = button2.dataset.create === "page" ? "page" : button2.dataset.create === "shell" ? "shell" : "component";
      const route = kind === "page" ? prompt("Page route:", `/${name}`) : void 0;
      if (route === null) return;
      const shellId = kind === "page" && workspace2.shells?.length ? prompt("Shell ID (leave empty for Application default):\n" + workspace2.shells.map((shell) => `${shell.metadata?.displayName}: ${shell.metadata?.artifactId}`).join("\n"), "") : void 0;
      if (shellId === null) return;
      let dataset;
      if (button2.dataset.create === "form-dataset") {
        const schema = prompt("Paste the published Dataset schema JSON (dataset and fields with stable IDs):");
        if (!schema) return;
        dataset = JSON.parse(schema);
      }
      const bundle = await request(`${base}/visual-${plural(kind)}`, { method: "POST", body: JSON.stringify({ name, route, shellId, ...isForm ? { form: { dataset } } : {} }) });
      workspace2 = await request(`${base}/visual-artifacts`);
      open(bundle, kind);
    })));
    find("[data-file]").addEventListener("change", () => {
      role = find("[data-file]").value;
      find("[data-source]").value = files[role];
    });
    find("[data-source]").addEventListener("input", () => {
      files[role] = find("[data-source]").value;
      changed(`source:${role}`);
    });
    find("[data-nodes]").addEventListener("change", () => {
      invalidateCard("SELECTION_CHANGED", true);
      selectedNode = find("[data-nodes]").value;
      renderInspector();
      evaluateCard();
    });
    find("[data-root]").addEventListener("click", () => {
      invalidateCard("SELECTION_CHANGED", true);
      selectedNode = "";
      renderStructure();
      evaluateCard();
    });
    target.querySelectorAll("[data-move]").forEach((button2) => button2.addEventListener("click", safe(() => {
      files.source = moveNode(files.source, selectedNode, button2.dataset.move);
      find("[data-source]").value = files[role];
      changed();
    })));
    find("[data-add]").addEventListener("click", safe(() => {
      if (selectedKind === "page" && workingMetadata().shellId) {
        let container = parseSource(files.source).nodes.find((node) => node.id === selectedNode);
        while (container && !container.attributes["data-uip-region"]) container = container.parent;
        if (!container) throw new Error("Add or select a Page Region before inserting content. Fixed surrounding content belongs to the Shell.");
      }
      const [kind, ...rest] = find("[data-insert]").value.split(":");
      const reference = rest.join(":");
      const pkg = workspace2.packages.find((p) => p.id === reference);
      const tag = kind === "html" ? reference : kind === "package" ? pkg.tagName : "uip-component";
      const ids = [`node_${crypto.randomUUID()}`, `node_${crypto.randomUUID()}`], childId = ids[1];
      const parent = parseSource(files.source).nodes.find((node) => node.id === selectedNode), parentReference = parent?.attributes["data-uip-component"];
      const parentSlots = workspace2.components.find((item) => item.metadata?.componentId === parentReference)?.metadata?.public?.slots ?? workspace2.packages.find((item) => item.id === parentReference)?.definition?.runtime.slots.map((slot2) => slot2.name);
      if (parentReference && !parentSlots?.length) throw new Error("This Component has no declared public insertion slots.");
      const slot = parentReference ? parentSlots[0] : void 0;
      files.source = insertNode(files.source, tag, kind === "html" ? void 0 : reference, selectedNode || void 0, () => ids.shift(), workspace2.packages.some((item) => item.id === parentReference) && slot === "default" ? "" : slot);
      if (tag === "uip-slot") files.source = setNodeAttribute(files.source, childId, "name", workingMetadata().public?.slots[0] ?? "");
      selectedNode = childId;
      find("[data-source]").value = files[role];
      changed();
    }));
    find("[data-save]").addEventListener("click", safe(async () => {
      if (!copy2) return;
      copy2.saveRequest = transport.capture();
      await copy2.lifecycle.flush();
    }));
    for (const action of ["undo", "redo"]) find(`[data-${action}]`).addEventListener("click", safe(() => {
      if (!copy2) return;
      copy2.saveRequest = transport.capture();
      copy2.lifecycle[action]();
    }));
    find("[data-repair]").addEventListener("click", safe(async () => {
      if (!copy2 || conflict || !confirm("Save this complete source candidate through Advanced Repair? Invalid source may block previews.")) return;
      const original = copy2, authorized = transport.capture();
      original.lifecycle.suspend();
      find("[data-work]").inert = true;
      try {
        await original.lifecycle.inFlight;
        const saved = await authorized(url(), { method: "PUT", body: JSON.stringify({ mode: "repair", files: original.lifecycle.current, expectedHash: original.bundle.hash }) });
        original.bundle = saved;
        original.lifecycle.reset(saved.files);
      } finally {
        original.lifecycle.resume();
        find("[data-work]").inert = false;
      }
    }));
    find("[data-reload]").addEventListener("click", safe(async () => {
      if (!copy2 || dirty() && !confirm("Discard editor changes and reload disk source?")) return;
      const original = copy2, kind = selectedKind, section = role, authorized = transport.capture();
      find("[data-work]").inert = true;
      original.lifecycle.suspend();
      try {
        await original.lifecycle.inFlight;
        const saved = await authorized(`${base}/visual-${plural(kind)}?locator=${encodeURIComponent(original.bundle.locator)}`);
        if (copy2 === original) {
          open(saved, kind, true);
          role = section;
          find("[data-file]").value = role;
          find("[data-source]").value = files[role];
        } else {
          original.bundle = saved;
          original.lifecycle.reset(saved.files);
        }
      } finally {
        original.lifecycle.resume();
        find("[data-work]").inert = false;
      }
    }));
    find("[data-recover]").addEventListener("click", () => {
      const blob = URL.createObjectURL(new Blob([JSON.stringify({ locator: selected?.locator, files, originalHash: hash }, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = blob;
      link.download = "visual-artifact-recovery.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(blob), 1e3);
    });
    find("[data-delete]").addEventListener("click", safe(async () => {
      if (dirty() || conflict) throw new Error("Save or recover changes before deletion.");
      if (!confirm("Move this artifact bundle to the Recycle Bin?")) return;
      await request(url(), { method: "DELETE", body: JSON.stringify({ expectedHash: hash }) });
      if (copy2) {
        await copy2.lifecycle.dispose();
        copies.delete(`${selectedKind}:${selected.locator}`);
      }
      copy2 = void 0;
      selected = void 0;
      find("[data-work]").hidden = true;
      workspace2 = await request(`${base}/visual-artifacts`);
      renderList();
      status("Deleted");
    }));
    async function showPreview() {
      if (!active2 || disposed) return;
      if (dirty() || conflict) throw new Error("Save source before previewing.");
      preview?.remove();
      preview = document.createElement("iframe");
      preview.title = "Nonpersisting Visual Artifact design preview";
      preview.src = "/visual-preview.html";
      preview.style.cssText = "width:100%;min-height:500px;border:1px solid #ccc";
      if (!active2 || disposed || !preview) return;
      const frame = preview, previewApplicationKey = options.applicationKey?.() ?? appKey;
      frame.addEventListener("load", () => {
        if (active2 && !disposed && frame === preview) frame.contentWindow.postMessage({ type: "uip-preview", design: true, locator: selected.locator, kind: selectedKind, hash, appKey: previewApplicationKey }, location.origin);
      });
      find("[data-preview-host]").append(preview);
    }
    find("[data-preview]").addEventListener("click", safe(showPreview));
    async function refresh(event) {
      if (event) invalidateCard("SOURCE_CHANGED");
      if (disposed || options.initial && !active2) return;
      if (!target.isConnected) return;
      if (polling || saving || operations > 0) return;
      polling = true;
      try {
        const next = await request(`${base}/visual-artifacts`);
        if (disposed || options.initial && !active2) return;
        const dependenciesChanged = JSON.stringify([workspace2.shells, workspace2.components].flat().map((bundle) => bundle?.hash)) !== JSON.stringify([next.shells, next.components].flat().map((bundle) => bundle?.hash));
        if (dependenciesChanged || JSON.stringify(workspace2.packages) !== JSON.stringify(next.packages) || list(selectedKind).find((bundle) => bundle.locator === selected?.locator)?.hash !== (selectedKind === "page" ? next.pages : selectedKind === "shell" ? next.shells : next.components).find((bundle) => bundle.locator === selected?.locator)?.hash) invalidateCard("SOURCE_CHANGED");
        workspace2 = structuredClone(next);
        renderList();
        if (selected) {
          const disk = list(selectedKind).find((b) => b.locator === selected.locator);
          if (!disk || disk.hash !== hash) {
            if (dirty()) {
              copy2?.lifecycle.conflict();
              changed();
            } else if (disk) {
              const node = selectedNode;
              open(disk, selectedKind);
              selectedNode = node;
              renderStructure();
              status("Reloaded external source changes");
            } else {
              conflict = true;
              status("Artifact was removed externally. Download recovery before changing selection.");
            }
          } else if (!dirty() && !conflict && selected.metadata?.shellId && (dependenciesChanged || event)) {
            renderStructure();
            await showPreview();
          }
        }
      } catch (error) {
        status(String(error));
      } finally {
        polling = false;
      }
    }
    workspace2 = structuredClone(options.workspace ?? await request(`${base}/visual-artifacts`));
    renderList();
    status("Select or create a Visual Artifact");
    if (options.initial) {
      find("[data-artifacts]").parentElement.hidden = true;
      const bundle = list(options.initial.kind).find((b) => b.locator === options.initial.locator);
      if (!bundle) throw new Error("Artifact unavailable.");
      open(bundle, options.initial.kind);
    }
    const unprotect = protectEditingDraft(() => [...copies.values()].some((item) => item.lifecycle.dirty || item.lifecycle.state === "conflict"));
    const timer = setInterval(() => {
      void refresh();
    }, 3e3);
    document.addEventListener("ui-platform-workspace-change", refresh);
    const unsubscribeCardContext = options.savedCardContext?.subscribe(() => invalidateCard("CONTEXT_CHANGED")) ?? (() => {
    });
    document.addEventListener("visibilitychange", cardVisibility);
    return {
      savedCardTarget,
      state: () => ({ dirty: [...copies.values()].some((item) => item.lifecycle.dirty), pending: saving || operations > 0, conflict }),
      deactivate() {
        invalidateCard("NOT_ACTIVE");
        active2 = false;
        preview?.remove();
        preview = void 0;
      },
      suspend() {
        invalidateCard("SUSPENDED");
        actionDrafts.clear();
        for (const item of copies.values()) item.lifecycle.suspend();
        target.hidden = true;
      },
      focus(next, navigation = {}) {
        if (disposed) return;
        invalidateCard("SELECTION_CHANGED", true);
        workspace2 = structuredClone(next);
        const disk = list(selectedKind).find((b) => b.locator === selected?.locator);
        if (!disk) throw new Error("Artifact unavailable.");
        if (disk.hash !== hash && !copy2?.lifecycle.inFlight) {
          if (dirty()) {
            copy2?.lifecycle.conflict();
            changed();
          } else {
            const node = selectedNode, section = role;
            open(disk, selectedKind);
            selectedNode = node;
            role = section;
          }
        }
        active2 = true;
        target.hidden = false;
        copy2?.lifecycle.resume();
        if (navigation.node !== void 0) selectedNode = navigation.node;
        if (navigation.section && ["source", "css", "metadata", "fixtures", "code"].includes(navigation.section)) role = navigation.section;
        find("[data-file]").value = role;
        find("[data-source]").value = files[role];
        try {
          renderStructure();
        } catch {
          status("Invalid local source retained. Repair source before using structured controls.");
        }
        if (navigation.node !== void 0) evaluateCard();
      },
      async dispose() {
        disposed = true;
        active2 = false;
        if (!cardTerminal) {
          cardTerminal = true;
          cardEpoch++;
          cardSourceGeneration++;
          cardPending = false;
          cardCompletion = void 0;
          publishCard({ state: "unavailable", reason: "DISPOSED", generation: cardGenerations(), target: null });
        }
        unsubscribeCardContext();
        document.removeEventListener("visibilitychange", cardVisibility);
        cardListeners.clear();
        clearInterval(timer);
        document.removeEventListener("ui-platform-workspace-change", refresh);
        unprotect();
        transport.dispose();
        await Promise.all([...copies.values()].map((item) => item.lifecycle.dispose()));
        preview?.remove();
        target.replaceChildren();
      }
    };
  }

  // src/client/builder-workspace/adapters.ts
  async function mountWorkspaceEditor(initial, changed, related, close, createDataset) {
    const element = document.createElement("article");
    element.className = "workspace-editor";
    element.setAttribute("aria-label", `${initial.kind} editor`);
    const originalSubject = editorSessionSnapshot()?.principal?.subjectId;
    const originalApp = initial.applicationKey;
    let artifact = initial, active2 = false, disposed = false, binding = createEditorSessionBinding();
    const disabledControls = /* @__PURE__ */ new Map();
    function controls(editable) {
      for (const [control, disabled] of disabledControls) control.disabled = disabled;
      disabledControls.clear();
      if (editable || artifact.generic) return;
      for (const control of element.querySelectorAll("input, select, textarea, button")) {
        if (control.matches("[data-nodes], [data-file], [data-preview], [data-recover], [data-reload], [data-root]") || control.textContent === "Edit Definition") continue;
        disabledControls.set(control, control.disabled);
        control.disabled = true;
      }
    }
    let state = () => ({ dirty: false, pending: false });
    let savedCardTarget;
    let deactivate = () => {
    }, suspend = () => {
    }, dispose = async () => {
    };
    let focus = async (_next, _target) => {
    };
    const assert = () => {
      binding.assert();
      if (disposed || editorSessionSnapshot()?.principal?.subjectId !== originalSubject) throw new Error("Original authorized identity required.");
    };
    function captureRequest() {
      assert();
      if (!active2) throw new Error("Focus and authorize this artifact before editing.");
      const original = artifact, session2 = binding;
      return async (url, init) => {
        session2.assert();
        if (disposed || editorSessionSnapshot()?.principal?.subjectId !== originalSubject) throw new Error("Original authorized identity required.");
        url = url.replace(`/api/apps/${encodeURIComponent(originalApp)}/`, `/api/apps/${encodeURIComponent(original.applicationKey)}/`);
        const endpoint = new URL(url, location.origin);
        const method = init?.method ?? "GET";
        if (!["GET", "PUT"].includes(method) || method === "PUT" && !original.editable || (endpoint.searchParams.get("locator") ?? endpoint.searchParams.get("path")) !== original.locator) throw new Error("Queued operation belongs to another artifact or lacks editing authority.");
        const headers = await session2.headers();
        session2.assert();
        const response = await fetch(url, { ...init, headers: { ...headers, "content-type": "application/json", "x-editor-application-id": original.applicationId } });
        const value = await response.json();
        session2.assert();
        if (!response.ok) throw Object.assign(new Error(value.error ?? value.code ?? "Editor request denied."), { status: response.status, code: value.code });
        if (method === "PUT") sourceSaved(url);
        return value;
      };
    }
    async function request(url, init) {
      assert();
      const requestBinding = binding, applicationKey = artifact.applicationKey;
      const assertResponse = () => {
        requestBinding.assert();
        assert();
        if (applicationKey !== artifact.applicationKey) throw new Error("Application context changed during the request.");
      };
      const mutation = !!init?.method && init.method !== "GET";
      if (mutation && (!active2 || !artifact.editable)) throw new Error("Focus and authorize this artifact before editing.");
      url = url.replace(`/api/apps/${encodeURIComponent(originalApp)}/`, `/api/apps/${encodeURIComponent(artifact.applicationKey)}/`);
      if (mutation) {
        const endpoint = new URL(url, location.origin);
        const locator = endpoint.searchParams.get("locator") ?? endpoint.searchParams.get("path");
        if (locator !== null && locator !== artifact.locator) throw new Error("Mutation belongs to another artifact.");
        if (init?.method === "POST") {
          const body = JSON.parse(String(init.body ?? "{}"));
          if (!endpoint.pathname.endsWith("/page-shell") || body.locator !== artifact.locator) throw new Error("Create and link operations are outside this focused tab.");
        }
      }
      if (!mutation && (url.endsWith("/visual-artifacts") || url.endsWith("/composition"))) {
        const next = await authorizeWorkspace(artifact.applicationKey, { identity: artifact.identity });
        assertResponse();
        artifact = next;
        const supplied = url.endsWith("/visual-artifacts") ? next.visual : next.composition;
        if (supplied !== void 0) return supplied;
      }
      if (!mutation && /^\/api\/automation\/[^?]+$/.test(url)) return [artifact.automation];
      const headers = await binding.headers();
      const response = await fetch(url, { ...init, headers: { ...headers, "content-type": "application/json", ...init?.headers } });
      const value = await response.json();
      assertResponse();
      if (!response.ok) throw Object.assign(new Error(value.error ?? value.code ?? "Editor request denied."), { status: response.status, code: value.code });
      if (init?.method === "PUT") sourceSaved(url);
      return value;
    }
    try {
      if (initial.visual?.components.find((b) => b.locator === initial.locator && b.metadata?.form)) {
        const context2 = new EditorRuntimeContext(originalApp, () => createVisualFormTransport(() => artifact), window, () => artifact.applicationKey);
        const previewHost = document.createElement("section");
        previewHost.setAttribute("aria-label", "Form preview surface");
        previewHost.hidden = true;
        bindFormEditor(context2, { applicationKey: () => artifact.applicationKey, previewHost, createDataset: async () => {
          if (!createDataset) throw new Error("Dataset creation coordinator unavailable.");
          await createDataset(context2);
        } });
        const view2 = mountEditorShell(element, context2, {}, void 0, { close, previewHost });
        element.append(previewHost);
        const unsubscribe = context2.subscribe(changed);
        await context2.open(initial.locator);
        state = () => ({ dirty: !!context2.snapshot?.dirty, pending: context2.pending || context2.snapshot?.saveState === "saving", conflict: context2.snapshot?.saveState === "conflict", error: context2.snapshot?.error });
        suspend = () => context2.suspend();
        dispose = async () => {
          unsubscribe();
          view2.destroy();
          await context2.discard();
          await context2.dispose();
        };
        focus = async (next, target) => {
          if (!context2.hasCopy) await context2.open(next.locator);
          if (!next.editable && context2.snapshot?.artifact.capabilities.edit) context2.suspend();
          view2.navigate(target.section, target.source);
          context2.refreshPresentation();
        };
      } else if (initial.visual) {
        const editor = await mountVisualEditor(element, originalApp, {
          request,
          captureRequest,
          applicationId: initial.applicationId,
          workspace: initial.visual,
          savedCardContext: { get: () => {
            binding.assert();
            const session2 = editorSessionSnapshot();
            if (disposed || !session2?.principal || session2.principal.subjectId !== originalSubject || artifact.applicationId !== initial.applicationId || artifact.identity.owner.kind !== "application" || artifact.identity.format !== "visual" || !artifact.identity.id || artifact.identity.repairLocator) return;
            return { applicationId: initial.applicationId, page: artifact.identity, subjectId: originalSubject, sessionRevision: session2.revision };
          }, subscribe: subscribeEditorSession },
          initial: { kind: initial.kind, locator: initial.locator },
          onDefinition: related,
          onStateChange: changed,
          applicationKey: () => artifact.applicationKey
        });
        state = editor.state;
        deactivate = editor.deactivate;
        suspend = editor.suspend;
        dispose = async () => editor.dispose();
        savedCardTarget = editor.savedCardTarget;
        focus = async (next, target) => editor.focus(next.visual, target);
      } else if (initial.generic) {
        const context2 = new EditorRuntimeContext(originalApp);
        const view2 = mountEditorShell(element, context2, {}, void 0, { close });
        const unsubscribe = context2.subscribe(changed);
        dispose = async () => {
          unsubscribe();
          view2.destroy();
          await context2.discard();
          await context2.dispose();
        };
        await context2.open(initial.locator);
        let retainedDirty = false;
        state = () => {
          const snapshot = context2.snapshot;
          retainedDirty = snapshot?.dirty ?? retainedDirty;
          return {
            dirty: retainedDirty,
            pending: context2.pending || snapshot?.saveState === "saving",
            conflict: snapshot?.saveState === "conflict",
            error: snapshot?.error
          };
        };
        suspend = () => {
          state();
          context2.suspend();
        };
        focus = async (next, target) => {
          if (!context2.hasCopy) await context2.open(next.locator);
          if (!next.generic?.capabilities.edit && context2.snapshot?.artifact.capabilities.edit) suspend();
          view2.navigate(target.section, target.source);
        };
      } else if (initial.composition && initial.source) {
        const editor = await mountCompositionManager(element, originalApp, { request, captureRequest, applicationId: initial.applicationId, definition: initial.composition, source: initial.source, onStateChange: changed });
        if (!editor) throw new Error("Composition unavailable.");
        state = editor.state;
        deactivate = editor.deactivate;
        suspend = editor.suspend;
        dispose = async () => editor.dispose();
        focus = async (next) => editor.focus(next.source);
      } else if (initial.automation) {
        const editor = await mountAutomationEditor(element, { request, captureRequest, kind: initial.kind, initial: initial.automation, onStateChange: changed });
        state = editor.state;
        deactivate = editor.deactivate;
        suspend = editor.suspend;
        dispose = async () => editor();
        focus = async (next, target) => editor.focus(next.automation, target.step);
      } else {
        const source2 = document.createElement("pre");
        source2.textContent = initial.source?.content ?? initial.legacy?.source ?? JSON.stringify(initial.package?.definition ?? initial.package, null, 2);
        const label = document.createElement("p");
        label.textContent = "Read-only source inspection";
        element.append(label, source2);
        focus = async (next) => {
          source2.textContent = next.source?.content ?? next.legacy?.source ?? JSON.stringify(next.package?.definition ?? next.package, null, 2);
        };
      }
    } catch (error) {
      await dispose();
      element.remove();
      throw error;
    }
    return {
      get savedCardTarget() {
        return savedCardTarget;
      },
      element,
      state,
      async focus(next, target) {
        if (disposed || editorSessionSnapshot()?.principal?.subjectId !== originalSubject) throw new Error("Original authorized identity required.");
        if (next.locator !== initial.locator) throw new Error("Artifact moved. The retained tab is suspended to protect its original draft. Recover or close it, then reopen the current artifact.");
        artifact = next;
        try {
          binding.assert();
        } catch {
          binding = createEditorSessionBinding();
        }
        await binding.headers();
        controls(true);
        await focus(next, target);
        assert();
        active2 = true;
        controls(next.editable);
        element.querySelector("[data-workspace-navigation-note]")?.remove();
        const nodeMissing = target.node && ![...element.querySelectorAll("[data-nodes] option")].some((option) => option.value === target.node);
        if (target.field || target.step && !next.automation || nodeMissing || target.source && !next.generic?.files.some((file) => file.path === target.source.file) && target.source.file !== "artifact.json") {
          const note = document.createElement("p");
          note.dataset.workspaceNavigationNote = "";
          note.textContent = "Artifact opened. This editor does not yet support a precise location for that navigation target.";
          element.prepend(note);
        }
      },
      deactivate() {
        active2 = false;
        deactivate();
        element.remove();
      },
      suspend() {
        active2 = false;
        binding.revoke();
        deactivate();
        suspend();
        element.remove();
      },
      async guardClose() {
        const current2 = state();
        if (current2.pending) return false;
        return !current2.dirty && !current2.conflict || confirm("Discard unsaved or invalid local changes and close this artifact? Cancel keeps the tab and its recovery copy.");
      },
      async dispose() {
        disposed = true;
        active2 = false;
        binding.revoke();
        try {
          await dispose();
        } finally {
          element.remove();
        }
      }
    };
  }

  // src/shared/builder-workspace.ts
  function workspaceIdentityKey(identity) {
    if (!identity || !identity.owner || !["application", "platform", "package"].includes(identity.owner.kind) || !identity.owner.id || !["visual", "generic", "composition", "automation", "package", "legacy"].includes(identity.format) || !!identity.id === !!identity.repairLocator) throw new Error("WORKSPACE_IDENTITY_INVALID");
    return JSON.stringify([
      identity.owner.kind,
      identity.owner.id,
      identity.owner.revision ?? null,
      identity.format,
      identity.id ? ["permanent", identity.id] : ["repair-only", identity.repairLocator]
    ]);
  }

  // src/client/builder-workspace/coordinator.ts
  var BuilderWorkspaceCoordinator = class {
    constructor(authorize, mount, subject) {
      this.authorize = authorize;
      this.mount = mount;
      this.subject = subject;
    }
    authorize;
    mount;
    subject;
    tabs = /* @__PURE__ */ new Map();
    focused;
    sequence = 0;
    disposed = false;
    requested;
    listeners = /* @__PURE__ */ new Set();
    opening = /* @__PURE__ */ new Map();
    captureLinkOrigin() {
      const tab = this.focused && this.tabs.get(this.focused), subject = this.subject();
      if (!tab || !subject || tab.suspended || tab.ownerSubject !== subject || !tab.artifact.editable) throw new Error("LINK_ORIGIN_UNAVAILABLE");
      return { key: tab.key, subject, applicationId: tab.artifact.applicationId, applicationKey: tab.artifact.applicationKey, editor: tab.editor };
    }
    assertLinkOrigin(origin) {
      const tab = this.tabs.get(origin.key);
      if (this.disposed || this.subject() !== origin.subject || !tab || tab.suspended || tab.ownerSubject !== origin.subject || tab.editor !== origin.editor || tab.artifact.applicationId !== origin.applicationId || tab.artifact.applicationKey !== origin.applicationKey) throw new Error("LINK_ORIGIN_STALE");
      return tab;
    }
    subscribe(listener) {
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    }
    emit() {
      for (const listener of this.listeners) listener();
    }
    deactivate() {
      if (this.focused) this.tabs.get(this.focused)?.editor.deactivate();
      this.focused = void 0;
    }
    async open(applicationKey, target) {
      if (this.disposed) return false;
      const sequence = ++this.sequence, subject = this.subject();
      this.deactivate();
      this.emit();
      let key;
      try {
        if (!subject) throw new Error("WORKSPACE_IDENTITY_REQUIRED");
        this.requested = workspaceIdentityKey(target.identity);
        const authorized = await this.authorize(applicationKey, target);
        key = workspaceIdentityKey(authorized.identity);
        if (key !== workspaceIdentityKey(target.identity)) throw new Error("WORKSPACE_IDENTITY_CHANGED");
        if (sequence !== this.sequence || this.subject() !== subject || this.disposed) return false;
        let tab = this.tabs.get(key);
        if (tab && tab.ownerSubject !== subject) throw new Error("Return to the original identity to recover this retained tab, or discard it.");
        if (!tab) {
          let pending = this.opening.get(key);
          if (!pending) {
            pending = { consumers: /* @__PURE__ */ new Set(), promise: this.mount(authorized).then((editor) => ({ key, artifact: authorized, editor, suspended: false, ownerSubject: subject })) };
            this.opening.set(key, pending);
          }
          pending.consumers.add(sequence);
          try {
            tab = await pending.promise;
            if (sequence !== this.sequence || this.subject() !== subject || this.disposed) return false;
            this.tabs.set(key, tab);
          } finally {
            pending.consumers.delete(sequence);
            if (!pending.consumers.size) {
              this.opening.delete(key);
              if (!this.tabs.has(key)) {
                const orphan = await pending.promise.catch(() => void 0);
                await orphan?.editor.dispose();
              }
            }
          }
        }
        await tab.editor.focus(authorized, target);
        if (sequence !== this.sequence || this.subject() !== subject || this.disposed) {
          if (this.focused !== key) tab.editor.deactivate();
          return false;
        }
        tab.artifact = authorized;
        tab.suspended = false;
        this.focused = key;
        this.emit();
        return true;
      } catch (error) {
        if (key && sequence === this.sequence) {
          const tab = this.tabs.get(key);
          if (tab) {
            tab.suspended = true;
            tab.editor.suspend();
          }
        }
        if (sequence === this.sequence) this.emit();
        throw error;
      }
    }
    park() {
      this.sequence++;
      this.deactivate();
      this.emit();
    }
    suspend() {
      this.sequence++;
      this.deactivate();
      for (const tab of this.tabs.values()) {
        tab.suspended = true;
        tab.editor.suspend();
      }
      this.emit();
    }
    async close(key, discard = false) {
      const tab = this.tabs.get(key);
      if (!tab) return true;
      if (!discard && !await tab.editor.guardClose()) return false;
      if (this.focused === key || this.requested === key) {
        this.sequence++;
        this.deactivate();
      }
      this.tabs.delete(key);
      try {
        await tab.editor.dispose();
      } finally {
        this.emit();
      }
      return true;
    }
    async dispose() {
      this.disposed = true;
      this.suspend();
      await Promise.allSettled([...this.tabs.keys()].map((key) => this.close(key, true)));
      this.listeners.clear();
    }
  };

  // src/client/fixture-preview/lifecycle.ts
  var identityKey = (value) => JSON.stringify([value.subjectId, value.sessionId, value.applicationId, value.artifactKey]);
  var PreviewLifecycle = class {
    value;
    sequence = 0;
    constructor(identity) {
      if (Object.values(identity).some((value) => typeof value !== "string" || !value || value.length > 4096) || Object.keys(identity).length !== 4) throw new Error("PREVIEW_IDENTITY_INVALID");
      this.value = { state: "empty", identity: structuredClone(identity) };
    }
    get snapshot() {
      return structuredClone(this.value);
    }
    refresh() {
      if (this.value.state === "disposed" || this.value.state === "revoked") throw new Error("PREVIEW_SESSION_CLOSED");
      const sequence = ++this.sequence;
      const pending = { identity: structuredClone(this.value.identity), sequence, requestId: `request-${sequence}` };
      this.value = { ...this.value, state: "capturing", pending, reason: void 0 };
      return structuredClone(pending);
    }
    matches(request) {
      return this.value.state === "capturing" && this.value.pending?.sequence === request.sequence && this.value.pending.requestId === request.requestId && identityKey(request.identity) === identityKey(this.value.identity);
    }
    succeed(request, capture) {
      if (!this.matches(request) || identityKey(capture.identity) !== identityKey(this.value.identity) || !capture.captureId) return false;
      if (this.value.last?.captureId === capture.captureId && JSON.stringify(this.value.last.provenance) !== JSON.stringify(capture.provenance)) return false;
      this.value = { state: "ready", identity: this.value.identity, last: structuredClone(capture) };
      return true;
    }
    fail(request, reason) {
      if (!this.matches(request)) return false;
      this.value = { ...this.value, state: this.value.last ? "stale" : "unavailable", pending: void 0, reason };
      return true;
    }
    invalidate(reason) {
      if (this.value.state === "disposed" || this.value.state === "revoked") return;
      this.sequence++;
      this.value = { ...this.value, state: this.value.last ? "stale" : "unavailable", pending: void 0, reason };
    }
    revoke(reason) {
      if (this.value.state === "disposed") return;
      this.sequence++;
      this.value = { state: "revoked", identity: this.value.identity, reason };
    }
    dispose() {
      this.sequence++;
      this.value = { state: "disposed", identity: this.value.identity };
    }
  };

  // src/client/fixture-preview/bootstrap.txt
  var bootstrap_default = '"use strict";\n(() => {\n  // ../ui-base/packages/ui-base-core/src/utils.js\n  var idCounter = 0;\n  function createId(prefix = "mt") {\n    idCounter += 1;\n    return `${prefix}-${idCounter}`;\n  }\n  function escapeHtml(value) {\n    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll(\'"\', "&quot;").replaceAll("\'", "&#39;");\n  }\n  function defineUiBaseElement(tagName, elementClass) {\n    installCssClassProperty(elementClass);\n    if (!customElements.get(tagName)) customElements.define(tagName, elementClass);\n    return elementClass;\n  }\n  function cssClassTokens(element) {\n    return String(element?.getAttribute?.("css-class") ?? element?.cssClass ?? "").split(/\\s+/).map((value) => value.trim()).filter(Boolean);\n  }\n  function applyCssClassToShadowRoot(element) {\n    if (!element) return;\n    const root = element.shadowRoot || element;\n    const target = root.querySelector("[data-uib-css-class-root]") || Array.from(root.children).find((child) => child instanceof HTMLElement && child.localName !== "style");\n    if (!target) return;\n    const previous = element.__uibCssClassTokens || [];\n    target.classList.remove(...previous);\n    const next = cssClassTokens(element);\n    if (next.length) target.classList.add(...next);\n    element.__uibCssClassTokens = next;\n  }\n  function installCssClassProperty(elementClass) {\n    const prototype = elementClass?.prototype;\n    if (!prototype) return elementClass;\n    if (!Object.getOwnPropertyDescriptor(prototype, "cssClass")) {\n      Object.defineProperty(prototype, "cssClass", {\n        configurable: true,\n        enumerable: true,\n        get() {\n          return this.getAttribute("css-class") || "";\n        },\n        set(value) {\n          setOrRemoveAttribute(this, "css-class", value);\n        }\n      });\n    }\n    const observed = Array.isArray(elementClass.observedAttributes) ? elementClass.observedAttributes : [];\n    if (!observed.includes("css-class")) {\n      Object.defineProperty(elementClass, "observedAttributes", {\n        configurable: true,\n        value: [...observed, "css-class"]\n      });\n    }\n    if (typeof prototype.render === "function" && !prototype.__uibCssClassRenderWrapped) {\n      const render = prototype.render;\n      prototype.render = function renderWithCssClass(...args) {\n        const result = render.apply(this, args);\n        applyCssClassToShadowRoot(this);\n        return result;\n      };\n      prototype.__uibCssClassRenderWrapped = true;\n    }\n    return elementClass;\n  }\n  function setOrRemoveAttribute(element, name, value) {\n    if (value === null || value === void 0 || value === false) {\n      element.removeAttribute(name);\n      return;\n    }\n    if (value === true) {\n      element.setAttribute(name, "");\n      return;\n    }\n    element.setAttribute(name, String(value));\n  }\n  function mergeIds(...ids) {\n    return ids.flatMap((value) => String(value ?? "").split(/\\s+/)).map((value) => value.trim()).filter(Boolean).filter((value, index, array) => array.indexOf(value) === index).join(" ");\n  }\n\n  // ../ui-base/packages/ui-base-core/src/validation.js\n  var VALIDATION_STATES = Object.freeze({\n    VALID: "valid",\n    INVALID: "invalid",\n    WARNING: "warning",\n    INFO: "info"\n  });\n\n  // ../ui-base/packages/ui-base-core/src/metadata.js\n  var MATURITY_LEVELS = Object.freeze({\n    EXPERIMENTAL: "experimental",\n    PREVIEW: "preview",\n    STABLE: "stable",\n    DEPRECATED: "deprecated",\n    RETIRED: "retired"\n  });\n\n  // ../ui-base/packages/ui-base-core/src/base-element.js\n  var UibBaseElement = class extends HTMLElement {\n    static commonAttributes = [\n      "name",\n      "label",\n      "help",\n      "help-mode",\n      "title",\n      "disabled",\n      "readonly",\n      "required",\n      "hidden",\n      "invalid",\n      "error",\n      "css-class",\n      "aria-label",\n      "aria-describedby"\n    ];\n    constructor() {\n      super();\n      this._uibId = createId(this.localName || "uib-component");\n    }\n    get componentId() {\n      return this.id || this._uibId;\n    }\n    get name() {\n      return this.getAttribute("name") || "";\n    }\n    set name(value) {\n      setOrRemoveAttribute(this, "name", value);\n    }\n    get label() {\n      return this.getAttribute("label") || "";\n    }\n    set label(value) {\n      setOrRemoveAttribute(this, "label", value);\n    }\n    get help() {\n      return this.getAttribute("help") || "";\n    }\n    set help(value) {\n      setOrRemoveAttribute(this, "help", value);\n    }\n    get helpMode() {\n      const mode = (this.getAttribute("help-mode") || "").toLowerCase();\n      return mode === "inline" ? "inline" : "tooltip";\n    }\n    set helpMode(value) {\n      setOrRemoveAttribute(this, "help-mode", value);\n    }\n    get titleText() {\n      return this.getAttribute("title") || "";\n    }\n    set titleText(value) {\n      setOrRemoveAttribute(this, "title", value);\n    }\n    get disabled() {\n      return this.hasAttribute("disabled");\n    }\n    set disabled(value) {\n      this.toggleAttribute("disabled", Boolean(value));\n    }\n    get readonly() {\n      return this.hasAttribute("readonly");\n    }\n    set readonly(value) {\n      this.toggleAttribute("readonly", Boolean(value));\n    }\n    get required() {\n      return this.hasAttribute("required");\n    }\n    set required(value) {\n      this.toggleAttribute("required", Boolean(value));\n    }\n    get invalid() {\n      return this.hasAttribute("invalid");\n    }\n    set invalid(value) {\n      this.toggleAttribute("invalid", Boolean(value));\n    }\n    get error() {\n      return this.getAttribute("error") || "";\n    }\n    set error(value) {\n      setOrRemoveAttribute(this, "error", value);\n    }\n    get ariaLabel() {\n      return this.getAttribute("aria-label") || "";\n    }\n    get ariaDescribedBy() {\n      return this.getAttribute("aria-describedby") || "";\n    }\n    get cssClass() {\n      return this.getAttribute("css-class") || "";\n    }\n    set cssClass(value) {\n      setOrRemoveAttribute(this, "css-class", value);\n    }\n    describedBy(...internalIds) {\n      return mergeIds(this.ariaDescribedBy, ...internalIds);\n    }\n    emitMtEvent(type, detail = {}, options = {}) {\n      this.dispatchEvent(new CustomEvent(type, {\n        bubbles: options.bubbles ?? true,\n        composed: options.composed ?? true,\n        cancelable: options.cancelable ?? false,\n        detail\n      }));\n    }\n    emitValueChange(componentEventName, oldValue, newValue, extra = {}) {\n      const detail = {\n        name: this.name,\n        oldValue,\n        newValue,\n        ...extra\n      };\n      this.emitMtEvent("change", detail);\n      if (componentEventName) this.emitMtEvent(componentEventName, detail);\n    }\n    attributeChangedCallback() {\n      if (this.isConnected && typeof this.render === "function") this.render();\n    }\n  };\n\n  // ../ui-base/packages/ui-base-icons/src/icon-registry.js\n  var icons = /* @__PURE__ */ new Map();\n  function registerMtIcon(name, svg) {\n    const normalized = String(name || "").trim().toLowerCase();\n    if (!normalized) throw new Error("Icon name is required.");\n    icons.set(normalized, String(svg || ""));\n  }\n  function getMtIcon(name) {\n    return icons.get(String(name || "").trim().toLowerCase()) || "";\n  }\n  registerMtIcon("help", \'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 17a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Zm1.1-5.1v.6h-2.1v-.8c0-1.4.8-2.1 1.6-2.7.7-.5 1.2-.9 1.2-1.7 0-.9-.7-1.5-1.8-1.5-1 0-1.7.5-2.3 1.3L8.2 7.9A4.4 4.4 0 0 1 12.1 6c2.4 0 4 1.4 4 3.3 0 1.8-1.1 2.6-2 3.2-.6.5-1 .8-1 1.4Z" fill="currentColor"/></svg>\');\n  registerMtIcon("info", \'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 10h2v8h-2v-8Zm0-4h2v2h-2V6Zm1-4a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" fill="currentColor"/></svg>\');\n  registerMtIcon("menu", \'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16v2H4v-2Zm0 4.5h16v2H4v-2Zm0 4.5h16v2H4v-2Z" fill="currentColor"/></svg>\');\n  registerMtIcon("close", \'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 12.6 12.6-1.4 1.4L5 6.4 6.4 5Zm12.6 1.4L6.4 19 5 17.6 17.6 5 19 6.4Z" fill="currentColor"/></svg>\');\n  registerMtIcon("chevron-down", \'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7.4 8.6 4.6 4.6 4.6-4.6L18 10l-6 6-6-6 1.4-1.4Z" fill="currentColor"/></svg>\');\n  registerMtIcon("check", \'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.2 16.6-4.1-4.1-1.4 1.4 5.5 5.5L20.3 8.3l-1.4-1.4-9.7 9.7Z" fill="currentColor"/></svg>\');\n  registerMtIcon("x", \'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 12.6 12.6-1.4 1.4L5 6.4 6.4 5Zm12.6 1.4L6.4 19 5 17.6 17.6 5 19 6.4Z" fill="currentColor"/></svg>\');\n  registerMtIcon("calendar", \'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v3h6V2h2v3h3v17H4V5h3V2Zm13 8H6v10h14V10ZM6 8h14V7H6v1Z" fill="currentColor"/></svg>\');\n  registerMtIcon("warning", \'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 1.8 21h20.4L12 3Zm1 15h-2v-2h2v2Zm0-4h-2V9h2v5Z" fill="currentColor"/></svg>\');\n  registerMtIcon("external-link", \'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14V3ZM5 5h6v2H7v10h10v-4h2v6H5V5Z" fill="currentColor"/></svg>\');\n\n  // ../ui-base/packages/ui-base-icons/src/uib-icon.js\n  var styles = `\n:host{display:inline-flex;width:var(--uib-icon-size,1em);height:var(--uib-icon-size,1em);line-height:1;flex:0 0 auto}*,*::before,*::after{box-sizing:border-box}.uib-icon{display:inline-flex;width:100%;height:100%;align-items:center;justify-content:center}.uib-icon svg,.uib-icon img{width:100%;height:100%;display:block}.uib-icon img{object-fit:contain}\n`;\n  var UibIcon = class extends UibBaseElement {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "name", "src", "url", "size", "decorative"];\n    }\n    constructor() {\n      super();\n      this.attachShadow({ mode: "open" });\n    }\n    connectedCallback() {\n      this.render();\n    }\n    get name() {\n      return this.getAttribute("name") || "";\n    }\n    set name(value) {\n      if (value === null || value === void 0) this.removeAttribute("name");\n      else this.setAttribute("name", String(value));\n    }\n    get src() {\n      return this.getAttribute("src") || this.getAttribute("url") || "";\n    }\n    set src(value) {\n      if (value === null || value === void 0) this.removeAttribute("src");\n      else this.setAttribute("src", String(value));\n    }\n    get decorative() {\n      return this.hasAttribute("decorative") || !this.label && !this.ariaLabel && !this.titleText;\n    }\n    set decorative(value) {\n      this.toggleAttribute("decorative", Boolean(value));\n    }\n    render() {\n      const label = this.ariaLabel || this.label || this.titleText || this.name || "Icon";\n      const aria = this.decorative ? \'aria-hidden="true"\' : `role="img" aria-label="${escapeHtml(label)}"`;\n      const size = this.getAttribute("size");\n      const sizeStyle = size ? `:host{--uib-icon-size:${escapeHtml(size)}}` : "";\n      const src = this.src;\n      const body = src ? `<img src="` + escapeHtml(src) + `" alt="` + (this.decorative ? "" : escapeHtml(label)) + `">` : getMtIcon(this.name) || getMtIcon("info");\n      this.shadowRoot.innerHTML = `<style> ` + styles + ` ` + sizeStyle + ` </style><span class="uib-icon" part="icon" ` + aria + `> ` + body + ` </span>`;\n    }\n  };\n  defineUiBaseElement("uib-icon", UibIcon);\n\n  // ../ui-base/packages/ui-base-ui/src/layout/index.js\n  var baseStyles = `\n:host{display:block;color:var(--uib-color-ink,#13294b);font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}*,*::before,*::after{box-sizing:border-box}.placeholder{padding:.75rem;border:1px dashed var(--uib-color-border-strong,#aab8cc);border-radius:var(--uib-radius-md,.75rem);background:var(--uib-color-surface-soft,#f8fbff);color:var(--uib-color-muted,#53657f);font-size:var(--uib-font-size-sm,.875rem)}\n`;\n  var UibLayoutBase = class extends UibBaseElement {\n    connectedCallback() {\n      this.render();\n    }\n  };\n  var UibStack = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "gap", "direction", "align", "justify"];\n    }\n    render() {\n      const gap = this.getAttribute("gap") || "var(--uib-space-3,.75rem)";\n      const direction = this.getAttribute("direction") || "column";\n      const align = this.getAttribute("align") || "stretch";\n      const justify = this.getAttribute("justify") || "start";\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `.uib-stack{display:flex;flex-direction:` + escapeHtml(direction) + `;gap:` + escapeHtml(gap) + `;align-items:` + escapeHtml(align) + `;justify-content:` + escapeHtml(justify) + `}@media(max-width:520px){.uib-stack{flex-wrap:wrap}} </style><div class="uib-stack" part="base"><slot></slot></div>`;\n    }\n  };\n  var UibGrid = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "columns", "min", "gap"];\n    }\n    render() {\n      const columns = this.getAttribute("columns");\n      const min = this.getAttribute("min") || "14rem";\n      const gap = this.getAttribute("gap") || "var(--uib-space-4,1rem)";\n      const template = columns ? `repeat(${Number(columns) || 1}, minmax(0, 1fr))` : `repeat(auto-fit, minmax(${min}, 1fr))`;\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `.uib-grid{display:grid;grid-template-columns:` + template + `;gap:` + escapeHtml(gap) + `}@media(max-width:520px){.uib-grid{grid-template-columns:1fr}} </style><div class="uib-grid" part="base"><slot></slot></div>`;\n    }\n  };\n  var UibRow = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "gap", "align", "justify", "wrap"];\n    }\n    render() {\n      const gap = this.getAttribute("gap") || "var(--uib-space-3,.75rem)";\n      const align = this.getAttribute("align") || "center";\n      const justify = this.getAttribute("justify") || "start";\n      const wrap = this.hasAttribute("wrap") ? "wrap" : "nowrap";\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `.uib-row{display:flex;flex-direction:row;gap:` + escapeHtml(gap) + `;align-items:` + escapeHtml(align) + `;justify-content:` + escapeHtml(justify) + `;flex-wrap:` + wrap + `}@media(max-width:420px){.uib-row{flex-wrap:wrap}} </style><div class="uib-row" part="base"><slot></slot></div>`;\n    }\n  };\n  var UibColumn = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "gap", "align", "justify"];\n    }\n    render() {\n      const gap = this.getAttribute("gap") || "var(--uib-space-3,.75rem)";\n      const align = this.getAttribute("align") || "stretch";\n      const justify = this.getAttribute("justify") || "start";\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `.uib-column{display:flex;flex-direction:column;gap:` + escapeHtml(gap) + `;align-items:` + escapeHtml(align) + `;justify-content:` + escapeHtml(justify) + `} </style><div class="uib-column" part="base"><slot></slot></div>`;\n    }\n  };\n  var UibSurfaceBase = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "heading", "variant", "density"];\n    }\n    surfaceName = "surface";\n    defaultVariant = "outlined";\n    connectedCallback() {\n      this.render();\n    }\n    get heading() {\n      return this.getAttribute("heading") || this.label || "";\n    }\n    get variant() {\n      const value = (this.getAttribute("variant") || this.defaultVariant).toLowerCase();\n      return ["outlined", "elevated", "flat"].includes(value) ? value : this.defaultVariant;\n    }\n    get density() {\n      return this.getAttribute("density") === "compact" ? "compact" : "comfortable";\n    }\n    hasNamedSlot(name) {\n      return Array.from(this.children).some((child) => child.getAttribute?.("slot") === name);\n    }\n    surfaceStyles(extra = "") {\n      return `<style> ` + baseStyles + `.uib-surface{display:block;overflow:hidden;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff);color:var(--uib-color-ink,#13294b);text-align:start;text-decoration:none}.uib-surface--elevated{box-shadow:var(--uib-shadow-sm,0 6px 18px rgba(10,31,68,.08))}.uib-surface--outlined{box-shadow:none}.uib-surface--flat{border-color:transparent;box-shadow:none}.uib-surface--disabled{cursor:not-allowed;opacity:.58}.uib-surface__header,.uib-surface__body,.uib-surface__footer,.uib-surface__actions{padding:var(--uib-space-4,1rem)}.uib-surface--compact .uib-surface__header,.uib-surface--compact .uib-surface__body,.uib-surface--compact .uib-surface__footer,.uib-surface--compact .uib-surface__actions{padding:var(--uib-space-3,.75rem)}.uib-surface__header{display:flex;gap:.75rem;align-items:center;justify-content:space-between;border-bottom:1px solid var(--uib-color-border,#d9e2f0);font-weight:850}.uib-surface__header[hidden],.uib-surface__footer[hidden],.uib-surface__actions[hidden],.uib-surface__media[hidden],.uib-surface__collapsible[hidden]{display:none!important}.uib-surface__footer{border-top:1px solid var(--uib-color-border,#d9e2f0);background:var(--uib-color-surface-soft,#f8fbff)}.uib-surface__actions{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;justify-content:flex-end;padding-bottom:0}.uib-surface:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))} ` + extra + ` </style>`;\n    }\n    headerMarkup(headingId, visible = true, after = "") {\n      const heading = this.heading;\n      return `<div class="uib-surface__header" part="header" ` + (headingId ? `id="${headingId}"` : "") + (visible ? "" : " hidden") + `><slot name="header">` + escapeHtml(heading) + `</slot>` + after + `</div>`;\n    }\n    bodyMarkup(hidden = false) {\n      return `<div class="uib-surface__body" part="body"` + (hidden ? " hidden" : "") + `><slot></slot></div>`;\n    }\n    footerMarkup(visible = true) {\n      return `<div class="uib-surface__footer" part="footer"` + (visible ? "" : " hidden") + `><slot name="footer"></slot></div>`;\n    }\n    surfaceClasses(...names) {\n      return [\n        "uib-surface",\n        `uib-${this.surfaceName}`,\n        `uib-surface--${this.variant}`,\n        `uib-surface--${this.density}`,\n        this.disabled ? "uib-surface--disabled" : "",\n        ...names\n      ].filter(Boolean).join(" ");\n    }\n  };\n  var UibPanel = class extends UibSurfaceBase {\n    static get observedAttributes() {\n      return [...super.observedAttributes, "collapsible", "open"];\n    }\n    surfaceName = "panel";\n    defaultVariant = "outlined";\n    get collapsible() {\n      return this.hasAttribute("collapsible");\n    }\n    get open() {\n      return !this.collapsible || this.hasAttribute("open");\n    }\n    set open(value) {\n      this.toggleAttribute("open", Boolean(value));\n    }\n    toggle() {\n      if (!this.collapsible || this.disabled) return;\n      const oldValue = this.open;\n      this.open = !oldValue;\n      this.emitValueChange("uib-panel-toggle", oldValue, this.open);\n    }\n    render() {\n      const headingId = this.heading ? `${this.componentId}-heading` : "";\n      const hasHeader = Boolean(this.heading) || this.hasNamedSlot("header") || this.hasNamedSlot("actions") || this.collapsible;\n      const hasActions = this.hasNamedSlot("actions");\n      const hasFooter = this.hasNamedSlot("footer");\n      const open = this.open;\n      const toggleButton = this.collapsible ? `<button class="uib-panel__toggle" part="toggle" type="button" aria-expanded="${open ? "true" : "false"}" ${this.disabled ? "disabled" : ""}><span class="uib-panel__toggle-icon" aria-hidden="true">` + (open ? "-" : "+") + `</span></button>` : "";\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = this.surfaceStyles(`.uib-panel .uib-surface__actions{margin-inline-start:auto;padding:0}.uib-panel__toggle{display:inline-grid;width:2rem;height:2rem;place-items:center;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-pill,999px);background:var(--uib-color-surface,#fff);color:var(--uib-color-ink,#13294b);cursor:pointer}.uib-panel__toggle:disabled{cursor:not-allowed}.uib-panel__toggle:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))}.uib-panel__toggle-icon{font-size:1rem;font-weight:900;line-height:1}`) + `<section class="${this.surfaceClasses()}" part="base" ` + (headingId ? `aria-labelledby="${headingId}"` : "") + (this.disabled ? \' aria-disabled="true"\' : "") + `>` + (hasHeader ? this.headerMarkup(headingId, true, `<div class="uib-surface__actions" part="actions"><slot name="actions"></slot></div>${toggleButton}`) : this.headerMarkup("", false)) + `<div class="uib-surface__collapsible" part="content"` + (open ? "" : " hidden") + `>` + (hasActions && !hasHeader ? `<div class="uib-surface__actions" part="actions"><slot name="actions"></slot></div>` : "") + this.bodyMarkup() + this.footerMarkup(hasFooter) + `</div></section>`;\n      this.shadowRoot.querySelector(".uib-panel__toggle")?.addEventListener("click", () => this.toggle());\n    }\n  };\n  var UibCard = class extends UibSurfaceBase {\n    static get observedAttributes() {\n      return [...super.observedAttributes, "href", "target", "rel", "action", "action-token", "interactive", "selectable", "selected"];\n    }\n    surfaceName = "card";\n    defaultVariant = "elevated";\n    connectedCallback() {\n      super.connectedCallback();\n      this._cardSlotObserver ||= new MutationObserver((records) => {\n        if (records.some((record) => record.target === this || record.type === "attributes" && record.target.parentElement === this)) this._updateCardSlots();\n      });\n      this._cardSlotObserver.observe(this, { childList: true, attributes: true, attributeFilter: ["slot"], subtree: true });\n    }\n    disconnectedCallback() {\n      this._cardSlotObserver?.disconnect();\n    }\n    attributeChangedCallback(name, oldValue, newValue) {\n      if (oldValue === newValue) return;\n      if (name === "selected" && this.shadowRoot?.querySelector(".uib-card")) {\n        const surface = this.shadowRoot.querySelector(".uib-card");\n        surface.classList.toggle("uib-card--selected", this.selected);\n        if (this.selectable) surface.setAttribute("aria-pressed", String(this.selected));\n        return;\n      }\n      super.attributeChangedCallback(name, oldValue, newValue);\n    }\n    _updateCardSlots() {\n      if (!this.shadowRoot) return;\n      for (const name of ["media", "header", "footer"]) {\n        const wrapper = this.shadowRoot.querySelector(`[part="${name}"]`);\n        if (wrapper) wrapper.hidden = name === "header" ? !this.heading && !this.hasNamedSlot(name) : !this.hasNamedSlot(name);\n      }\n    }\n    get href() {\n      return this.getAttribute("href") || "";\n    }\n    get target() {\n      return this.getAttribute("target") || "";\n    }\n    get rel() {\n      return this.getAttribute("rel") || "";\n    }\n    get action() {\n      return this.getAttribute("action") || "";\n    }\n    get actionToken() {\n      return this.getAttribute("action-token") || "";\n    }\n    get interactive() {\n      return this.hasAttribute("interactive") || Boolean(this.href || this.action || this.actionToken || this.selectable);\n    }\n    get selectable() {\n      return this.hasAttribute("selectable");\n    }\n    get selected() {\n      return this.hasAttribute("selected");\n    }\n    set selected(value) {\n      this.toggleAttribute("selected", Boolean(value));\n    }\n    shouldIgnoreActivation(event, surface) {\n      const interactiveSelector = \'a,button,input,select,textarea,summary,[role="button"],[role="link"],[contenteditable="true"]\';\n      for (const item of event?.composedPath?.() || []) {\n        if (item === surface) return false;\n        if (item instanceof HTMLElement && item.matches(interactiveSelector)) return true;\n      }\n      return false;\n    }\n    activate(event) {\n      if (this.disabled) {\n        event?.preventDefault?.();\n        return;\n      }\n      const surface = this.shadowRoot?.querySelector(".uib-card");\n      if (surface && this.shouldIgnoreActivation(event, surface)) return;\n      const oldSelected = this.selected;\n      if (this.selectable) {\n        this.selected = !oldSelected;\n        this.emitValueChange("uib-card-select", oldSelected, this.selected, { selected: this.selected });\n      }\n      if (this.action || this.actionToken) {\n        const allowed = this.dispatchEvent(new CustomEvent("uib-card-action", {\n          bubbles: true,\n          composed: true,\n          cancelable: true,\n          detail: {\n            name: this.name,\n            action: this.action,\n            actionToken: this.actionToken,\n            selected: this.selected\n          }\n        }));\n        if (!allowed) event?.preventDefault?.();\n      }\n    }\n    handleKeydown(event) {\n      if (!this.interactive || this.href) return;\n      if (event.key !== "Enter" && event.key !== " ") return;\n      const surface = this.shadowRoot?.querySelector(".uib-card");\n      if (surface && this.shouldIgnoreActivation(event, surface)) return;\n      event.preventDefault();\n      this.activate(event);\n    }\n    render() {\n      const hadSurfaceFocus = Boolean(this.shadowRoot?.activeElement) && this.shadowRoot.activeElement === this.shadowRoot.querySelector(".uib-card");\n      const headingId = this.heading ? `${this.componentId}-heading` : "";\n      const hasHeader = Boolean(this.heading) || this.hasNamedSlot("header");\n      const hasMedia = this.hasNamedSlot("media");\n      const hasFooter = this.hasNamedSlot("footer");\n      const tag = this.href ? "a" : "section";\n      const href = tag === "a" ? ` href="${escapeHtml(this.href)}"` : "";\n      const target = tag === "a" && this.target ? ` target="${escapeHtml(this.target)}"` : "";\n      const rel = tag === "a" && this.rel ? ` rel="${escapeHtml(this.rel)}"` : "";\n      const role = tag === "section" && this.interactive ? \' role="button"\' : "";\n      const tabIndex = this.interactive ? ` tabindex="${this.disabled ? "-1" : "0"}"` : "";\n      const ariaPressed = this.selectable ? ` aria-pressed="${this.selected ? "true" : "false"}"` : "";\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = this.surfaceStyles(`.uib-card{width:100%;font:inherit}.uib-card--interactive{cursor:pointer}.uib-card--selected{border-color:var(--uib-color-primary,#174a8b);box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.18))}.uib-card__media{display:block;overflow:hidden;background:var(--uib-color-surface-soft,#f8fbff)}.uib-card__media::slotted(img),.uib-card__media::slotted(video),.uib-card__media::slotted(uib-media){display:block;width:100%}`) + `<${tag} class="${this.surfaceClasses(this.interactive ? "uib-card--interactive" : "", this.selected ? "uib-card--selected" : "")}" part="base" ` + (this.ariaLabel ? `aria-label="${escapeHtml(this.ariaLabel)}"` : headingId ? `aria-labelledby="${headingId}"` : "") + (this.ariaDescribedBy ? ` aria-describedby="${escapeHtml(this.ariaDescribedBy)}"` : "") + (this.disabled ? \' aria-disabled="true"\' : "") + ariaPressed + role + href + target + rel + tabIndex + `><div class="uib-card__media" part="media"` + (hasMedia ? "" : " hidden") + `><slot name="media"></slot></div>` + this.headerMarkup(headingId, hasHeader) + this.bodyMarkup() + this.footerMarkup(hasFooter) + `</${tag}>`;\n      const surface = this.shadowRoot.querySelector(".uib-card");\n      surface?.addEventListener("click", (event) => this.activate(event));\n      surface?.addEventListener("keydown", (event) => this.handleKeydown(event));\n      if (hadSurfaceFocus && this.interactive && !this.disabled) surface?.focus({ preventScroll: true });\n    }\n  };\n  var UibDialog = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "open", "heading"];\n    }\n    get open() {\n      return this.hasAttribute("open");\n    }\n    set open(value) {\n      this.toggleAttribute("open", Boolean(value));\n    }\n    show() {\n      this.open = true;\n    }\n    close() {\n      const oldValue = true;\n      this.open = false;\n      this.emitValueChange("uib-dialog-close", oldValue, false);\n    }\n    render() {\n      const heading = this.label || this.getAttribute("heading") || "Dialog";\n      const headingId = `${this.componentId}-heading`;\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `:host{display:` + (this.open ? "block" : "none") + `}.uib-dialog{position:fixed;inset:0;z-index:var(--uib-z-index-modal,1100);display:grid;place-items:center;padding:1rem;background:rgba(6,21,40,.48)}.uib-dialog__panel{width:min(42rem,100%);max-height:calc(100vh - 2rem);overflow:auto;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff);box-shadow:var(--uib-shadow-lg,0 24px 70px rgba(10,31,68,.14))}.uib-dialog__header{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem;border-bottom:1px solid var(--uib-color-border,#d9e2f0);font-weight:850}.uib-dialog__body{padding:1rem}.uib-dialog__footer{padding:1rem;border-top:1px solid var(--uib-color-border,#d9e2f0);background:var(--uib-color-surface-soft,#f8fbff)}button{border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-pill,999px);background:var(--uib-color-surface,#fff);padding:.45rem .65rem;cursor:pointer} </style><div class="uib-dialog" part="backdrop"><section class="uib-dialog__panel" part="panel" role="dialog" aria-modal="true" aria-labelledby="` + headingId + `"><div class="uib-dialog__header" part="header"><span id="` + headingId + `"><slot name="header">` + escapeHtml(heading) + `</slot></span><button type="button" part="close-button" aria-label="Close"><uib-icon name="close" decorative></uib-icon></button></div><div class="uib-dialog__body" part="body"><slot></slot></div><div class="uib-dialog__footer" part="footer"><slot name="footer"></slot></div></section></div>`;\n      this.shadowRoot.querySelector("button")?.addEventListener("click", () => this.close());\n      this.shadowRoot.querySelector(".uib-dialog")?.addEventListener("click", (event) => {\n        if (event.target === event.currentTarget) this.close();\n      });\n    }\n  };\n  var UibAccordion = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "open", "heading"];\n    }\n    render() {\n      const heading = this.label || this.getAttribute("heading") || "Accordion";\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `details{border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff);overflow:hidden}summary{cursor:pointer;padding:1rem;font-weight:850}summary:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))}.uib-accordion__body{padding:0 1rem 1rem} </style><details part="base" ` + (this.hasAttribute("open") ? "open" : "") + `><summary part="summary"><slot name="summary">` + escapeHtml(heading) + `</slot></summary><div class="uib-accordion__body" part="body"><slot></slot></div></details>`;\n      this.shadowRoot.querySelector("details")?.addEventListener("toggle", (event) => {\n        const open = event.currentTarget.open;\n        this.toggleAttribute("open", open);\n        this.emitMtEvent("uib-accordion-toggle", { name: this.name, oldValue: !open, newValue: open });\n      });\n    }\n  };\n  var UibTab = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "selected", "aria-selected", "aria-disabled"];\n    }\n    get disabled() {\n      return this.hasAttribute("disabled") || this.getAttribute("aria-disabled") === "true";\n    }\n    set disabled(value) {\n      this.toggleAttribute("disabled", Boolean(value));\n    }\n    render() {\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `:host{display:inline-flex;align-items:center;justify-content:center;min-height:2.3rem;min-width:2.75rem;padding:.55rem .78rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-pill,999px);background:var(--uib-color-surface,#fff);color:var(--uib-color-ink,#13294b);font:inherit;font-weight:850;line-height:1.2;cursor:pointer;user-select:none;outline:none}:host(:focus-visible){box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))}:host([selected]),:host([aria-selected="true"]){border-color:var(--uib-color-primary,#174a8b);background:var(--uib-color-primary,#174a8b);color:var(--uib-color-primary-contrast,#fff)}:host([disabled]),:host([aria-disabled="true"]){cursor:not-allowed;opacity:.58}::slotted(*){pointer-events:none} </style><slot></slot>`;\n    }\n  };\n  var UibTabPanel = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "selected"];\n    }\n    render() {\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `:host{display:block;padding:1rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff)}:host([hidden]){display:none!important} </style><slot></slot>`;\n    }\n  };\n  var UibTabs = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "selected", "orientation"];\n    }\n    constructor() {\n      super();\n      this._reflectingSelected = false;\n      this._pendingSelected = null;\n      this._syncing = false;\n      this._observer = null;\n      this._boundClick = (event) => this._handleClick(event);\n      this._boundKeydown = (event) => this._handleKeydown(event);\n    }\n    get selected() {\n      return this.getAttribute("selected") || "";\n    }\n    set selected(value) {\n      if (value === null || value === void 0 || value === "") this.removeAttribute("selected");\n      else this.setAttribute("selected", String(value));\n    }\n    get orientation() {\n      return this.getAttribute("orientation") === "vertical" ? "vertical" : "horizontal";\n    }\n    set orientation(value) {\n      if (value === "vertical") this.setAttribute("orientation", "vertical");\n      else this.setAttribute("orientation", "horizontal");\n    }\n    connectedCallback() {\n      this.render();\n      this._connectObserver();\n      this._syncTabs({ emit: false });\n    }\n    disconnectedCallback() {\n      this._observer?.disconnect();\n      this._observer = null;\n      this.removeEventListener("click", this._boundClick);\n      this.removeEventListener("keydown", this._boundKeydown);\n    }\n    attributeChangedCallback(name, oldValue, newValue) {\n      if (oldValue === newValue) return;\n      if (name === "selected" && !this._reflectingSelected) this._pendingSelected = newValue;\n      if (this.isConnected) {\n        this.render();\n        this._syncTabs({ emit: false });\n      }\n    }\n    render() {\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `:host{display:block}.uib-tabs{display:grid;gap:.75rem}.uib-tabs--vertical{grid-template-columns:max-content minmax(0,1fr);align-items:start}.uib-tabs__list{display:flex;gap:.35rem;flex-wrap:wrap}.uib-tabs--vertical .uib-tabs__list{flex-direction:column;align-items:stretch}.uib-tabs__panels{min-width:0}@media(max-width:640px){.uib-tabs--vertical{grid-template-columns:1fr}.uib-tabs--vertical .uib-tabs__list{flex-direction:row;align-items:center}} </style><div class="uib-tabs uib-tabs--` + escapeHtml(this.orientation) + `" part="base"><div class="uib-tabs__list" part="tablist" role="tablist" aria-orientation="` + escapeHtml(this.orientation) + `"><slot name="tab"></slot></div><div class="uib-tabs__panels" part="panels"><slot name="panel"></slot></div></div>`;\n      this.removeEventListener("click", this._boundClick);\n      this.removeEventListener("keydown", this._boundKeydown);\n      this.addEventListener("click", this._boundClick);\n      this.addEventListener("keydown", this._boundKeydown);\n    }\n    _connectObserver() {\n      this._observer?.disconnect();\n      this._observer = new MutationObserver(() => this._syncTabs({ emit: false }));\n      this._observer.observe(this, {\n        childList: true,\n        attributes: true,\n        subtree: true,\n        attributeFilter: ["disabled", "aria-disabled"]\n      });\n    }\n    _tabs() {\n      return Array.from(this.children).filter((child) => child.localName === "uib-tab");\n    }\n    _panels() {\n      return Array.from(this.children).filter((child) => child.localName === "uib-tab-panel");\n    }\n    _isDisabled(tab) {\n      return tab.hasAttribute("disabled") || tab.getAttribute("aria-disabled") === "true";\n    }\n    _setManagedAttribute(element, name, value) {\n      if (element.getAttribute(name) !== value) element.setAttribute(name, value);\n    }\n    _parseSelected() {\n      const value = this._pendingSelected ?? this.getAttribute("selected");\n      if (value === null || value === void 0 || value === "") return null;\n      const parsed = Number(value);\n      return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;\n    }\n    _firstEnabledIndex(tabs) {\n      return tabs.findIndex((tab) => !this._isDisabled(tab));\n    }\n    _lastEnabledIndex(tabs) {\n      for (let index = tabs.length - 1; index >= 0; index -= 1) {\n        if (!this._isDisabled(tabs[index])) return index;\n      }\n      return -1;\n    }\n    _normalizeSelected(tabs) {\n      const requested = this._parseSelected();\n      if (requested !== null && tabs[requested] && !this._isDisabled(tabs[requested])) return requested;\n      return this._firstEnabledIndex(tabs);\n    }\n    _reflectSelected(index) {\n      this._reflectingSelected = true;\n      if (index >= 0) this.setAttribute("selected", String(index));\n      else this.removeAttribute("selected");\n      this._reflectingSelected = false;\n      this._pendingSelected = null;\n    }\n    _syncTabs({ emit = false, oldValue = null } = {}) {\n      if (this._syncing) return;\n      this._syncing = true;\n      const tabs = this._tabs();\n      const panels = this._panels();\n      const selectedIndex = this._normalizeSelected(tabs);\n      tabs.forEach((tab, index) => {\n        const selected = index === selectedIndex;\n        const disabled = this._isDisabled(tab);\n        const panel = panels[index];\n        const tabId = tab.id || `${this.componentId}-tab-${index}`;\n        const panelId = panel?.id || `${this.componentId}-panel-${index}`;\n        if (!tab.id) tab.id = tabId;\n        tab.slot = "tab";\n        this._setManagedAttribute(tab, "role", "tab");\n        this._setManagedAttribute(tab, "aria-selected", selected ? "true" : "false");\n        this._setManagedAttribute(tab, "aria-disabled", disabled ? "true" : "false");\n        if (panel) this._setManagedAttribute(tab, "aria-controls", panelId);\n        else tab.removeAttribute("aria-controls");\n        tab.toggleAttribute("selected", selected);\n        tab.tabIndex = selected || selectedIndex < 0 && index === 0 ? 0 : -1;\n      });\n      panels.forEach((panel, index) => {\n        const selected = index === selectedIndex;\n        const tab = tabs[index];\n        const tabId = tab?.id || `${this.componentId}-tab-${index}`;\n        const panelId = panel.id || `${this.componentId}-panel-${index}`;\n        if (!panel.id) panel.id = panelId;\n        panel.slot = "panel";\n        this._setManagedAttribute(panel, "role", "tabpanel");\n        if (tab) this._setManagedAttribute(panel, "aria-labelledby", tabId);\n        else panel.removeAttribute("aria-labelledby");\n        panel.toggleAttribute("hidden", !selected);\n        panel.toggleAttribute("selected", selected);\n        panel.tabIndex = selected ? 0 : -1;\n      });\n      this._reflectSelected(selectedIndex);\n      this._syncing = false;\n      const newValue = selectedIndex >= 0 ? selectedIndex : null;\n      if (emit && oldValue !== newValue) this.emitValueChange("uib-tabs-change", oldValue, newValue);\n    }\n    _selectIndex(index, { emit = true, focus = true } = {}) {\n      const tabs = this._tabs();\n      if (!tabs[index] || this._isDisabled(tabs[index])) {\n        if (focus && tabs[index]) tabs[index].focus();\n        return;\n      }\n      const oldValue = this._normalizeSelected(tabs);\n      this._pendingSelected = String(index);\n      this._syncTabs({ emit, oldValue: oldValue >= 0 ? oldValue : null });\n      if (focus) tabs[index]?.focus();\n    }\n    _handleClick(event) {\n      const tab = event.target.closest?.("uib-tab");\n      if (!tab || tab.parentElement !== this) return;\n      const index = this._tabs().indexOf(tab);\n      this._selectIndex(index, { emit: true, focus: true });\n    }\n    _handleKeydown(event) {\n      const currentTab = event.target.closest?.("uib-tab");\n      if (!currentTab || currentTab.parentElement !== this) return;\n      const tabs = this._tabs();\n      const currentIndex = tabs.indexOf(currentTab);\n      if (currentIndex < 0) return;\n      const nextKey = this.orientation === "vertical" ? "ArrowDown" : "ArrowRight";\n      const previousKey = this.orientation === "vertical" ? "ArrowUp" : "ArrowLeft";\n      if (event.key === nextKey || event.key === previousKey) {\n        event.preventDefault();\n        const direction = event.key === nextKey ? 1 : -1;\n        const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;\n        tabs[nextIndex]?.focus();\n        if (!this._isDisabled(tabs[nextIndex])) this._selectIndex(nextIndex, { emit: true, focus: false });\n      } else if (event.key === "Home") {\n        event.preventDefault();\n        this._selectIndex(this._firstEnabledIndex(tabs), { emit: true, focus: true });\n      } else if (event.key === "End") {\n        event.preventDefault();\n        this._selectIndex(this._lastEnabledIndex(tabs), { emit: true, focus: true });\n      } else if (event.key === "Enter" || event.key === " ") {\n        event.preventDefault();\n        this._selectIndex(currentIndex, { emit: true, focus: true });\n      }\n    }\n  };\n  var UibSplitter = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "position"];\n    }\n    render() {\n      const position = this.getAttribute("position") || "1fr 1fr";\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `.uib-splitter{display:grid;grid-template-columns:` + escapeHtml(position) + `;gap:var(--uib-space-4,1rem)}.uib-splitter__pane{min-width:0;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff);padding:1rem}@media(max-width:700px){.uib-splitter{grid-template-columns:1fr}} </style><div class="uib-splitter" part="base"><section class="uib-splitter__pane" part="pane-start"><slot name="start"></slot></section><section class="uib-splitter__pane" part="pane-end"><slot name="end"></slot><slot></slot></section></div>`;\n    }\n  };\n  defineUiBaseElement("uib-stack", UibStack);\n  defineUiBaseElement("uib-grid", UibGrid);\n  defineUiBaseElement("uib-row", UibRow);\n  defineUiBaseElement("uib-column", UibColumn);\n  defineUiBaseElement("uib-panel", UibPanel);\n  defineUiBaseElement("uib-card", UibCard);\n  defineUiBaseElement("uib-dialog", UibDialog);\n  defineUiBaseElement("uib-accordion", UibAccordion);\n  defineUiBaseElement("uib-tab", UibTab);\n  defineUiBaseElement("uib-tab-panel", UibTabPanel);\n  defineUiBaseElement("uib-tabs", UibTabs);\n  defineUiBaseElement("uib-splitter", UibSplitter);\n\n  // ../ui-base/packages/ui-base-ui/src/platform/definition.js\n  function copySerializable(value) {\n    const seen = /* @__PURE__ */ new Set();\n    const visit = (item, path = "$") => {\n      if (item === null || typeof item === "string" || typeof item === "boolean") return;\n      if (typeof item === "number" && Number.isFinite(item)) return;\n      if (!item || typeof item !== "object") throw new TypeError(`${path} must contain JSON values only.`);\n      if (seen.has(item)) throw new TypeError(`${path} contains a cycle.`);\n      if (!Array.isArray(item) && Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) throw new TypeError(`${path} contains a runtime object.`);\n      seen.add(item);\n      for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(item))) {\n        if (Array.isArray(item) && key === "length") continue;\n        if (["__proto__", "constructor", "prototype"].includes(key) || descriptor.get || descriptor.set) throw new TypeError(`${path}.${key} is not a data field.`);\n        visit(descriptor.value, `${path}.${key}`);\n      }\n      seen.delete(item);\n    };\n    visit(value);\n    return JSON.parse(JSON.stringify(value));\n  }\n  function freezeDefinition(value) {\n    for (const child of Object.values(value)) if (child && typeof child === "object") freezeDefinition(child);\n    return Object.freeze(value);\n  }\n  var isSettingVisible = (setting, values) => !setting.visibleWhen || values[setting.visibleWhen.setting] === setting.visibleWhen.equals;\n  function defaultSettings(definition) {\n    return Object.fromEntries(Object.entries(definition.builder.settings).map(([name, setting]) => [name, setting.default]));\n  }\n  function safeAuthoringUrl(value, image = false) {\n    if (!value) return true;\n    if (typeof value !== "string" || /[\\u0000-\\u0020\\u007f]/.test(value.trim())) return false;\n    const input = value.trim();\n    if (input.startsWith("//") || input.includes("\\\\")) return false;\n    if (!/^[a-z][a-z\\d+.-]*:/i.test(input)) return true;\n    return image ? /^https?:/i.test(input) : /^(https?|mailto|tel):/i.test(input);\n  }\n  function validateDefinition(input) {\n    const errors = [];\n    let definition;\n    try {\n      definition = copySerializable(input);\n    } catch (error) {\n      return [error.message];\n    }\n    const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);\n    if (!object(definition)) return ["Component Definition must be an object."];\n    if (definition.schemaVersion !== "1.0.0") errors.push("Unsupported Component Definition schema version.");\n    for (const field of ["componentId", "name", "displayName", "description"]) if (typeof definition.identity?.[field] !== "string" || field !== "description" && !definition.identity[field].trim()) errors.push(`identity.${field} is required.`);\n    if (!["platform", "application"].includes(definition.ownership?.scope)) errors.push("Scope must be platform or application.");\n    if (!definition.ownership?.package?.packageId || !definition.version?.packageVersion) errors.push("Owning package and package version are required.");\n    if (!["code", "composite"].includes(definition.implementation?.type)) errors.push("Implementation type must be code or composite.");\n    if (definition.implementation?.type === "composite") errors.push("Composite graph validation is outside this reference stage.");\n    if (typeof definition.implementation?.tagName !== "string" || !definition.implementation.tagName.includes("-")) errors.push("A custom-element tag is required.");\n    if (definition.implementation?.runtimeBinding?.kind !== "custom-element" || definition.implementation.runtimeBinding.tagName !== definition.implementation.tagName) errors.push("Runtime binding must identify the declared custom element.");\n    if (typeof definition.implementation?.importPath !== "string" || typeof definition.implementation?.exportName !== "string") errors.push("Code import path and export name are required.");\n    if (!Array.isArray(definition.implementation?.aliases) || definition.implementation.aliases.some((alias) => !object(alias) || typeof alias.importPath !== "string" || typeof alias.exportName !== "string")) errors.push("Compatibility aliases must declare import paths and export names.");\n    if (definition.tagName !== definition.implementation?.tagName || definition.module !== definition.implementation?.module) errors.push("Legacy manifest projections must match the canonical implementation.");\n    if (!object(definition.runtime?.attributes) || !object(definition.runtime?.properties) || !object(definition.runtime?.events) || !Array.isArray(definition.runtime?.slots) || definition.runtime.slots.some((slot) => !object(slot) || typeof slot.name !== "string")) errors.push("Runtime API sections are required.");\n    if (!object(definition.builder?.settings) || Object.values(definition.builder.settings).some((setting) => !object(setting)) || !Array.isArray(definition.builder?.groups) || definition.builder.groups.some((group) => !object(group) || typeof group.id !== "string")) errors.push("Builder settings/groups are required.");\n    if (!Array.isArray(definition.capabilities) || definition.capabilities.some((capability) => typeof capability !== "string")) errors.push("Capabilities must be named strings.");\n    if (!object(definition.presentation) || !Array.isArray(definition.presentation.cssVariables)) errors.push("Presentation styling hooks are required.");\n    if (!object(definition.dependencies) || !Array.isArray(definition.dependencies.packages) || !Array.isArray(definition.dependencies.services)) errors.push("Package and service dependencies are required.");\n    if (!object(definition.lifecycle) || !["installed", "workspace", "published"].includes(definition.lifecycle.state)) errors.push("An explicit lifecycle state is required.");\n    if (errors.length) return errors;\n    const groups = new Set(definition.builder.groups.map((group) => group.id));\n    const slots = new Set(definition.runtime.slots.map((slot) => slot.name));\n    for (const [name, projection] of Object.entries(definition.presentation.settings || {})) {\n      const setting = definition.builder.settings[name];\n      if (!setting || projection.type !== "select" || JSON.stringify(projection.options) !== JSON.stringify(setting.enum)) errors.push(`${name} legacy presentation projection must match its Builder setting.`);\n    }\n    for (const [name, setting] of Object.entries(definition.builder.settings)) {\n      if (!groups.has(setting.group)) errors.push(`${name} references an unknown editor group.`);\n      if (!["string", "boolean", "number"].includes(setting.type) || typeof setting.default !== setting.type) errors.push(`${name} has an invalid type/default.`);\n      if (setting.enum && !setting.enum.includes(setting.default)) errors.push(`${name} default is outside its allowed values.`);\n      const binding = setting.binding || {};\n      if (binding.kind === "attribute" && !definition.runtime.attributes[binding.name]) errors.push(`${name} binds an unknown attribute.`);\n      else if (binding.kind === "property" && !definition.runtime.properties[binding.name]?.writable) errors.push(`${name} binds a read-only or unknown property.`);\n      else if (binding.kind === "slot" && (!slots.has(binding.name) || !["text", "image"].includes(binding.content))) errors.push(`${name} binds an invalid slot.`);\n      else if (binding.kind === "event" && !definition.runtime.events[binding.name]) errors.push(`${name} binds an unknown event.`);\n      else if (binding.kind === "cssProperty" && !definition.presentation.cssVariables?.includes(binding.name)) errors.push(`${name} binds an unknown styling hook.`);\n      else if (!["attribute", "property", "slot", "slotMetadata", "event", "mode", "cssProperty"].includes(binding.kind)) errors.push(`${name} has an unsupported binding.`);\n      if (setting.visibleWhen && !definition.builder.settings[setting.visibleWhen.setting]) errors.push(`${name} has an unknown visibility condition.`);\n    }\n    for (const [name, setting] of Object.entries(definition.builder.definitionSettings || {})) {\n      if (!["identity.displayName", "identity.description"].includes(setting.binding?.path)) errors.push(`${name} cannot edit this definition field in V1.`);\n    }\n    return errors;\n  }\n  function validateSettings(definition, input, { registry, resolveHandlers = false } = {}) {\n    const errors = [];\n    let values;\n    try {\n      values = copySerializable(input);\n    } catch (error) {\n      return [error.message];\n    }\n    if (!values || Array.isArray(values) || typeof values !== "object") return ["Settings must be an object."];\n    for (const name of Object.keys(values)) if (!definition.builder.settings[name]) errors.push(`Unknown setting: ${name}.`);\n    const effective = { ...defaultSettings(definition), ...values };\n    for (const [name, setting] of Object.entries(definition.builder.settings)) {\n      const value = effective[name];\n      if (typeof value !== setting.type || setting.type === "number" && !Number.isFinite(value)) {\n        errors.push(`${setting.label} must be ${setting.type}.`);\n        continue;\n      }\n      if (setting.enum && !setting.enum.includes(value)) errors.push(`${setting.label} has an unsupported value.`);\n      if (!isSettingVisible(setting, effective) && value !== setting.default) errors.push(`${setting.label} is not allowed in this interaction mode.`);\n      if ((setting.format === "url" || setting.format === "image-url") && !safeAuthoringUrl(value, setting.format === "image-url")) errors.push(`${setting.label} uses an unsupported URL.`);\n      if (resolveHandlers && setting.binding.kind === "event" && value && !registry?.hasHandler(value)) errors.push(`Handler is not registered: ${value}.`);\n    }\n    for (const rule of definition.builder.validation || []) {\n      const applies = !rule.when || effective[rule.when.setting] === rule.when.equals;\n      if (!applies) continue;\n      if (rule.kind === "requiredWhen" && !String(effective[rule.setting] || "").trim()) errors.push(`${definition.builder.settings[rule.setting].label} is required.`);\n      if (rule.kind === "oneOfRequiredWhen" && !rule.settings.some((name) => String(effective[name] || "").trim())) errors.push("An action or action token is required.");\n      if (rule.kind === "accessibleNameWhenInteractive" && effective.interactionMode !== "none" && !rule.settings.some((name) => String(effective[name] || "").trim())) errors.push("Interactive cards need an accessible name.");\n    }\n    return errors;\n  }\n\n  // ../ui-base/packages/ui-base-ui/src/platform/renderer.js\n  function renderComponentInstance(definition, instance, { registry, document: ownerDocument = document, preview = false, onEvent = () => {\n  } } = {}) {\n    if (definition.implementation.type !== "code") throw new Error("Composite rendering is outside this reference stage.");\n    if (definition.implementation.runtimeBinding.kind !== "custom-element") throw new Error("Unsupported runtime binding.");\n    const errors = validateSettings(definition, instance.settings, { registry, resolveHandlers: !preview });\n    if (instance.componentId !== definition.identity.componentId) errors.push("Instance Component identity does not match its Definition.");\n    const serviceRefs = copySerializable(instance.serviceRefs || {});\n    const declaredServices = definition.dependencies.services || [];\n    for (const name of Object.keys(serviceRefs)) if (!declaredServices.some((service) => service.name === name)) errors.push(`Unknown service reference: ${name}.`);\n    for (const service of declaredServices) if (service.required && !serviceRefs[service.name]) errors.push(`Service reference is required: ${service.name}.`);\n    if (errors.length) throw new Error(errors.join("\\n"));\n    const tag = definition.implementation.runtimeBinding.tagName;\n    if (!ownerDocument.defaultView.customElements.get(tag)) throw new Error(`Runtime implementation is not registered: ${tag}.`);\n    const element = ownerDocument.createElement(tag);\n    const values = { ...defaultSettings(definition), ...instance.settings };\n    for (const [name, setting] of Object.entries(definition.builder.settings)) {\n      if (!isSettingVisible(setting, values)) continue;\n      const value = values[name];\n      const binding = setting.binding;\n      if (binding.kind === "attribute") {\n        if (setting.type === "boolean") element.toggleAttribute(binding.name, value);\n        else if (value !== "") element.setAttribute(binding.name, String(value));\n      } else if (binding.kind === "property") element[binding.name] = value;\n      else if (binding.kind === "cssProperty") element.style.setProperty(binding.name, value);\n      else if (binding.kind === "slot" && value !== "") {\n        const child = ownerDocument.createElement(binding.content === "image" ? "img" : "span");\n        if (binding.name !== "default") child.slot = binding.name;\n        if (binding.content === "image") {\n          child.src = value;\n          child.alt = values[binding.altSetting] || "";\n        } else child.textContent = value;\n        element.append(child);\n      }\n    }\n    for (const [name, value] of Object.entries(definition.builder.interactionModes?.[values.interactionMode]?.attributes || {})) {\n      if (typeof value === "boolean") element.toggleAttribute(name, value);\n      else element.setAttribute(name, String(value));\n    }\n    for (const service of declaredServices) if (serviceRefs[service.name]) element[service.property] = registry.service(serviceRefs[service.name]);\n    for (const [name, contract] of Object.entries(definition.runtime.events)) {\n      element.addEventListener(name, (event) => {\n        if (event.target !== element) return;\n        const detail = Object.fromEntries(Object.keys(contract.detail).filter((key) => event.detail?.[key] !== void 0).map((key) => [key, event.detail[key]]));\n        const payload = copySerializable(detail);\n        onEvent({ type: name, detail: payload });\n        if (preview) {\n          if (event.cancelable) event.preventDefault();\n          return;\n        }\n        const setting = Object.entries(definition.builder.settings).find(([, item]) => item.binding.kind === "event" && item.binding.name === name);\n        const handlerId = setting && values[setting[0]];\n        if (handlerId && registry.handler(handlerId)(payload, { element, event }) === false && event.cancelable) event.preventDefault();\n      });\n    }\n    if (preview) element.addEventListener("click", (event) => {\n      if (event.composedPath().some((node) => node?.localName === "a")) event.preventDefault();\n    }, { capture: true });\n    return element;\n  }\n\n  // ../ui-base/packages/ui-base-ui/src/platform/registry.js\n  var ComponentRegistry = class {\n    #definitions = /* @__PURE__ */ new Map();\n    #routes = /* @__PURE__ */ new Map();\n    #handlers = /* @__PURE__ */ new Map();\n    #services = /* @__PURE__ */ new Map();\n    registerManifest(manifest, { packageId, scope = "platform" } = {}) {\n      if (!packageId || !Array.isArray(manifest?.components)) throw new Error("Manifest components and package owner are required.");\n      const staged = [];\n      const ids = new Set(this.#definitions.keys());\n      for (const entry of manifest.components) {\n        if (!entry.schemaVersion) continue;\n        const definition = copySerializable(entry);\n        const errors = validateDefinition(definition);\n        if (definition.ownership?.package?.packageId !== packageId || definition.ownership?.scope !== scope) errors.push("Definition does not match its declared owning package/scope.");\n        if (ids.has(definition.identity?.componentId)) errors.push("Component identity is already registered.");\n        if (errors.length) throw new Error(errors.join("\\n"));\n        ids.add(definition.identity.componentId);\n        staged.push(freezeDefinition(definition));\n      }\n      for (const definition of staged) {\n        const id = definition.identity.componentId;\n        this.#definitions.set(id, definition);\n        const implementation = definition.implementation;\n        const routes = [\n          id,\n          implementation.tagName,\n          definition.identity.name,\n          `${scope}:${packageId}:${implementation.tagName}`,\n          implementation.importPath,\n          `${implementation.importPath}#${implementation.exportName}`,\n          ...(implementation.aliases || []).flatMap((alias) => [alias.importPath, `${alias.importPath}#${alias.exportName}`])\n        ];\n        for (const route of routes) {\n          if (!this.#routes.has(route)) this.#routes.set(route, /* @__PURE__ */ new Set());\n          this.#routes.get(route).add(id);\n        }\n      }\n      return staged;\n    }\n    resolve(reference, { packageId, scope } = {}) {\n      const candidates = [...this.#routes.get(reference) || []].map((id) => this.#definitions.get(id)).filter((definition) => (!packageId || definition.ownership.package.packageId === packageId) && (!scope || definition.ownership.scope === scope));\n      if (candidates.length !== 1) throw new Error(candidates.length ? `Ambiguous component route: ${reference}. Specify owner/scope.` : `Unknown component: ${reference}.`);\n      return candidates[0];\n    }\n    discover({ scope, capability } = {}) {\n      return [...this.#definitions.values()].filter((definition) => (!scope || definition.ownership.scope === scope) && (!capability || definition.capabilities.includes(capability)));\n    }\n    registerHandler(id, handler) {\n      if (!id || typeof handler !== "function" || this.#handlers.has(id)) throw new Error("A unique handler ID and function are required.");\n      this.#handlers.set(id, handler);\n    }\n    hasHandler(id) {\n      return this.#handlers.has(id);\n    }\n    handler(id) {\n      if (!this.#handlers.has(id)) throw new Error(`Handler is not registered: ${id}.`);\n      return this.#handlers.get(id);\n    }\n    registerService(id, service) {\n      if (!id || service == null || this.#services.has(id)) throw new Error("A unique service ID and runtime service are required.");\n      this.#services.set(id, service);\n    }\n    service(id) {\n      if (!this.#services.has(id)) throw new Error(`Service is not registered: ${id}.`);\n      return this.#services.get(id);\n    }\n  };\n\n  // ../ui-base/packages/ui-base-ui/ui.component.json\n  var ui_component_default = {\n    components: [\n      {\n        tagName: "uib-heading",\n        module: "./src/content/uib-heading.js",\n        importPath: "./heading",\n        presentation: {\n          settings: {\n            size: {\n              type: "select",\n              options: [\n                "compact",\n                "default",\n                "large"\n              ],\n              inheritable: true\n            },\n            align: {\n              type: "select",\n              options: [\n                "start",\n                "center",\n                "end"\n              ],\n              inheritable: true\n            }\n          }\n        }\n      },\n      {\n        tagName: "uib-heading-block",\n        module: "./src/content/uib-heading-block.js",\n        importPath: "./heading-block",\n        presentation: {\n          settings: {\n            size: {\n              type: "select",\n              options: [\n                "compact",\n                "default",\n                "large"\n              ],\n              inheritable: true\n            },\n            align: {\n              type: "select",\n              options: [\n                "start",\n                "center",\n                "end"\n              ],\n              inheritable: true\n            }\n          }\n        }\n      },\n      {\n        tagName: "uib-card",\n        module: "./src/layout/uib-card.js",\n        importPath: "./card",\n        presentation: {\n          settings: {\n            variant: {\n              type: "select",\n              options: [\n                "elevated",\n                "outlined",\n                "flat"\n              ],\n              inheritable: true\n            },\n            density: {\n              type: "select",\n              options: [\n                "comfortable",\n                "compact"\n              ],\n              inheritable: true\n            }\n          },\n          parts: [\n            "base",\n            "media",\n            "header",\n            "body",\n            "footer"\n          ],\n          cssVariables: [\n            "--uib-color-ink",\n            "--uib-font-family-sans",\n            "--uib-color-border",\n            "--uib-radius-lg",\n            "--uib-color-surface",\n            "--uib-color-surface-soft",\n            "--uib-shadow-sm",\n            "--uib-space-3",\n            "--uib-space-4",\n            "--uib-focus-ring",\n            "--uib-color-primary"\n          ]\n        },\n        schemaVersion: "1.0.0",\n        identity: {\n          componentId: "cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1",\n          name: "card",\n          displayName: "Card",\n          description: "Repeatable content surface with optional link, action and selection behavior."\n        },\n        ownership: {\n          scope: "platform",\n          package: {\n            packageId: "@ui-base/ui",\n            scope: "platform",\n            version: "0.5.1"\n          },\n          provenance: {\n            origin: "installed-package",\n            promotedFromComponentId: null,\n            promotedFromRevisionId: null\n          }\n        },\n        implementation: {\n          type: "code",\n          tagName: "uib-card",\n          module: "./src/layout/uib-card.js",\n          importPath: "@ui-base/ui/card",\n          exportName: "UibCard",\n          runtimeBinding: {\n            kind: "custom-element",\n            tagName: "uib-card"\n          },\n          aliases: [\n            {\n              importPath: "@ui-base/ui",\n              exportName: "UibCard"\n            },\n            {\n              importPath: "@ui-base/ui/layout",\n              exportName: "UibCard"\n            }\n          ],\n          registrationSideEffects: [\n            "uib-stack",\n            "uib-grid",\n            "uib-row",\n            "uib-column",\n            "uib-panel",\n            "uib-card",\n            "uib-dialog",\n            "uib-accordion",\n            "uib-tab",\n            "uib-tab-panel",\n            "uib-tabs",\n            "uib-splitter",\n            "uib-icon"\n          ]\n        },\n        version: {\n          packageVersion: "0.5.1",\n          runtimeCompatibility: "^0.5.1",\n          revisionId: null\n        },\n        maturity: "experimental",\n        category: "content-surfaces",\n        runtime: {\n          attributes: {\n            name: {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            label: {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            help: {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            "help-mode": {\n              type: "string",\n              default: "tooltip",\n              observed: true,\n              serialization: "string"\n            },\n            title: {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            disabled: {\n              type: "boolean",\n              default: false,\n              observed: true,\n              serialization: "presence"\n            },\n            readonly: {\n              type: "boolean",\n              default: false,\n              observed: true,\n              serialization: "presence"\n            },\n            required: {\n              type: "boolean",\n              default: false,\n              observed: true,\n              serialization: "presence"\n            },\n            hidden: {\n              type: "boolean",\n              default: false,\n              observed: true,\n              serialization: "presence"\n            },\n            invalid: {\n              type: "boolean",\n              default: false,\n              observed: true,\n              serialization: "presence"\n            },\n            error: {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            "css-class": {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            "aria-label": {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            "aria-describedby": {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            heading: {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            variant: {\n              type: "string",\n              default: "elevated",\n              observed: true,\n              serialization: "string",\n              enum: [\n                "elevated",\n                "outlined",\n                "flat"\n              ]\n            },\n            density: {\n              type: "string",\n              default: "comfortable",\n              observed: true,\n              serialization: "string",\n              enum: [\n                "comfortable",\n                "compact"\n              ]\n            },\n            href: {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            target: {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            rel: {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            action: {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            "action-token": {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            interactive: {\n              type: "boolean",\n              default: false,\n              observed: true,\n              serialization: "presence"\n            },\n            selectable: {\n              type: "boolean",\n              default: false,\n              observed: true,\n              serialization: "presence"\n            },\n            selected: {\n              type: "boolean",\n              default: false,\n              observed: true,\n              serialization: "presence"\n            }\n          },\n          properties: {\n            name: {\n              type: "string",\n              attribute: "name",\n              writable: true,\n              default: ""\n            },\n            label: {\n              type: "string",\n              attribute: "label",\n              writable: true,\n              default: ""\n            },\n            help: {\n              type: "string",\n              attribute: "help",\n              writable: true,\n              default: ""\n            },\n            helpMode: {\n              type: "string",\n              attribute: "help-mode",\n              writable: true,\n              default: "tooltip"\n            },\n            titleText: {\n              type: "string",\n              attribute: "title",\n              writable: true,\n              default: ""\n            },\n            disabled: {\n              type: "boolean",\n              attribute: "disabled",\n              writable: true,\n              default: false\n            },\n            readonly: {\n              type: "boolean",\n              attribute: "readonly",\n              writable: true,\n              default: false\n            },\n            required: {\n              type: "boolean",\n              attribute: "required",\n              writable: true,\n              default: false\n            },\n            hidden: {\n              type: "boolean",\n              attribute: "hidden",\n              writable: true,\n              default: false\n            },\n            invalid: {\n              type: "boolean",\n              attribute: "invalid",\n              writable: true,\n              default: false\n            },\n            error: {\n              type: "string",\n              attribute: "error",\n              writable: true,\n              default: ""\n            },\n            cssClass: {\n              type: "string",\n              attribute: "css-class",\n              writable: true,\n              default: ""\n            },\n            ariaLabel: {\n              type: "string",\n              attribute: "aria-label",\n              writable: false,\n              default: ""\n            },\n            ariaDescribedBy: {\n              type: "string",\n              attribute: "aria-describedby",\n              writable: false,\n              default: ""\n            },\n            heading: {\n              type: "string",\n              attribute: "heading",\n              writable: false,\n              default: "",\n              fallback: "label"\n            },\n            variant: {\n              type: "string",\n              attribute: "variant",\n              writable: false,\n              default: "elevated",\n              normalization: "lowercase-or-default"\n            },\n            density: {\n              type: "string",\n              attribute: "density",\n              writable: false,\n              default: "comfortable",\n              normalization: "exact-compact-or-default"\n            },\n            href: {\n              type: "string",\n              attribute: "href",\n              writable: false,\n              default: ""\n            },\n            target: {\n              type: "string",\n              attribute: "target",\n              writable: false,\n              default: ""\n            },\n            rel: {\n              type: "string",\n              attribute: "rel",\n              writable: false,\n              default: ""\n            },\n            action: {\n              type: "string",\n              attribute: "action",\n              writable: false,\n              default: ""\n            },\n            actionToken: {\n              type: "string",\n              attribute: "action-token",\n              writable: false,\n              default: ""\n            },\n            interactive: {\n              type: "boolean",\n              attribute: "interactive",\n              writable: false,\n              default: false,\n              computedFrom: [\n                "interactive",\n                "href",\n                "action",\n                "action-token",\n                "selectable"\n              ]\n            },\n            selectable: {\n              type: "boolean",\n              attribute: "selectable",\n              writable: false,\n              default: false\n            },\n            selected: {\n              type: "boolean",\n              attribute: "selected",\n              writable: true,\n              default: false,\n              programmaticSetEmits: false\n            },\n            componentId: {\n              type: "string",\n              writable: false,\n              role: "runtime-instance-id"\n            }\n          },\n          events: {\n            change: {\n              detail: {\n                name: "string",\n                oldValue: "boolean",\n                newValue: "boolean",\n                selected: "boolean"\n              },\n              bubbles: true,\n              composed: true,\n              cancelable: false,\n              selectionAliasOf: "uib-card-select",\n              order: 1\n            },\n            "uib-card-select": {\n              detail: {\n                name: "string",\n                oldValue: "boolean",\n                newValue: "boolean",\n                selected: "boolean"\n              },\n              bubbles: true,\n              composed: true,\n              cancelable: false,\n              order: 2\n            },\n            "uib-card-action": {\n              detail: {\n                name: "string",\n                action: "string",\n                actionToken: "string",\n                selected: "boolean"\n              },\n              bubbles: true,\n              composed: true,\n              cancelable: true,\n              order: 3,\n              cancellation: "prevent-original-event-default-after-selection"\n            }\n          },\n          slots: [\n            {\n              name: "default",\n              content: "text-or-elements"\n            },\n            {\n              name: "media",\n              content: "text-or-elements"\n            },\n            {\n              name: "header",\n              content: "text-or-elements"\n            },\n            {\n              name: "footer",\n              content: "text-or-elements"\n            }\n          ]\n        },\n        children: {\n          runtime: "unrestricted-for-compatibility",\n          builder: {\n            content: [\n              "text",\n              "image"\n            ],\n            nestedInteractiveInLink: false\n          }\n        },\n        builder: {\n          groups: [\n            {\n              id: "content",\n              label: "Content"\n            },\n            {\n              id: "appearance",\n              label: "Appearance"\n            },\n            {\n              id: "interaction",\n              label: "Interaction"\n            },\n            {\n              id: "state",\n              label: "State"\n            },\n            {\n              id: "accessibility",\n              label: "Accessibility"\n            },\n            {\n              id: "events",\n              label: "Event bindings"\n            }\n          ],\n          definitionSettings: {\n            displayName: {\n              label: "Display name",\n              type: "string",\n              required: true,\n              binding: {\n                kind: "definition",\n                path: "identity.displayName"\n              }\n            },\n            description: {\n              label: "Description",\n              type: "string",\n              editor: "textarea",\n              binding: {\n                kind: "definition",\n                path: "identity.description"\n              }\n            }\n          },\n          settings: {\n            heading: {\n              label: "Heading",\n              type: "string",\n              group: "content",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "heading"\n              }\n            },\n            label: {\n              label: "Fallback label",\n              type: "string",\n              group: "content",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "label"\n              }\n            },\n            body: {\n              label: "Body",\n              type: "string",\n              group: "content",\n              default: "Card body",\n              binding: {\n                kind: "slot",\n                name: "default",\n                content: "text"\n              },\n              editor: "textarea"\n            },\n            header: {\n              label: "Header content",\n              type: "string",\n              group: "content",\n              default: "",\n              binding: {\n                kind: "slot",\n                name: "header",\n                content: "text"\n              }\n            },\n            footer: {\n              label: "Footer",\n              type: "string",\n              group: "content",\n              default: "",\n              binding: {\n                kind: "slot",\n                name: "footer",\n                content: "text"\n              }\n            },\n            mediaSrc: {\n              label: "Image URL",\n              type: "string",\n              group: "content",\n              default: "",\n              binding: {\n                kind: "slot",\n                name: "media",\n                content: "image",\n                altSetting: "mediaAlt"\n              },\n              format: "image-url"\n            },\n            mediaAlt: {\n              label: "Image description",\n              type: "string",\n              group: "content",\n              default: "",\n              binding: {\n                kind: "slotMetadata",\n                slot: "media",\n                name: "alt"\n              }\n            },\n            variant: {\n              label: "Variant",\n              type: "string",\n              group: "appearance",\n              default: "elevated",\n              binding: {\n                kind: "attribute",\n                name: "variant"\n              },\n              editor: "select",\n              enum: [\n                "elevated",\n                "outlined",\n                "flat"\n              ]\n            },\n            density: {\n              label: "Density",\n              type: "string",\n              group: "appearance",\n              default: "comfortable",\n              binding: {\n                kind: "attribute",\n                name: "density"\n              },\n              editor: "select",\n              enum: [\n                "comfortable",\n                "compact"\n              ]\n            },\n            cssClass: {\n              label: "CSS classes",\n              type: "string",\n              group: "appearance",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "css-class"\n              }\n            },\n            interactionMode: {\n              label: "Interaction mode",\n              type: "string",\n              group: "interaction",\n              default: "none",\n              binding: {\n                kind: "mode"\n              },\n              editor: "select",\n              enum: [\n                "none",\n                "link",\n                "action",\n                "selectable"\n              ]\n            },\n            href: {\n              label: "Link URL",\n              type: "string",\n              group: "interaction",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "href"\n              },\n              format: "url",\n              visibleWhen: {\n                setting: "interactionMode",\n                equals: "link"\n              }\n            },\n            target: {\n              label: "Link target",\n              type: "string",\n              group: "interaction",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "target"\n              },\n              editor: "select",\n              enum: [\n                "",\n                "_self",\n                "_blank",\n                "_parent",\n                "_top"\n              ],\n              visibleWhen: {\n                setting: "interactionMode",\n                equals: "link"\n              }\n            },\n            rel: {\n              label: "Link relationship",\n              type: "string",\n              group: "interaction",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "rel"\n              },\n              visibleWhen: {\n                setting: "interactionMode",\n                equals: "link"\n              }\n            },\n            action: {\n              label: "Action",\n              type: "string",\n              group: "interaction",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "action"\n              },\n              visibleWhen: {\n                setting: "interactionMode",\n                equals: "action"\n              }\n            },\n            actionToken: {\n              label: "Action token",\n              type: "string",\n              group: "interaction",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "action-token"\n              },\n              visibleWhen: {\n                setting: "interactionMode",\n                equals: "action"\n              }\n            },\n            selected: {\n              label: "Initially selected",\n              type: "boolean",\n              group: "state",\n              default: false,\n              binding: {\n                kind: "attribute",\n                name: "selected"\n              },\n              visibleWhen: {\n                setting: "interactionMode",\n                equals: "selectable"\n              }\n            },\n            disabled: {\n              label: "Disabled",\n              type: "boolean",\n              group: "state",\n              default: false,\n              binding: {\n                kind: "attribute",\n                name: "disabled"\n              }\n            },\n            name: {\n              label: "Event name",\n              type: "string",\n              group: "interaction",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "name"\n              }\n            },\n            ariaLabel: {\n              label: "Accessible name",\n              type: "string",\n              group: "accessibility",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "aria-label"\n              }\n            },\n            ariaDescribedBy: {\n              label: "Description IDs",\n              type: "string",\n              group: "accessibility",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "aria-describedby"\n              }\n            },\n            actionHandler: {\n              label: "Action handler ID",\n              type: "string",\n              group: "events",\n              default: "",\n              binding: {\n                kind: "event",\n                name: "uib-card-action"\n              },\n              visibleWhen: {\n                setting: "interactionMode",\n                equals: "action"\n              }\n            },\n            selectionHandler: {\n              label: "Selection handler ID",\n              type: "string",\n              group: "events",\n              default: "",\n              binding: {\n                kind: "event",\n                name: "uib-card-select"\n              },\n              visibleWhen: {\n                setting: "interactionMode",\n                equals: "selectable"\n              }\n            }\n          },\n          interactionModes: {\n            none: {\n              attributes: {\n                interactive: false,\n                selectable: false\n              }\n            },\n            link: {\n              attributes: {\n                interactive: false,\n                selectable: false\n              }\n            },\n            action: {\n              attributes: {\n                interactive: true,\n                selectable: false\n              }\n            },\n            selectable: {\n              attributes: {\n                interactive: false,\n                selectable: true\n              }\n            }\n          },\n          validation: [\n            {\n              kind: "requiredWhen",\n              setting: "href",\n              when: {\n                setting: "interactionMode",\n                equals: "link"\n              }\n            },\n            {\n              kind: "oneOfRequiredWhen",\n              settings: [\n                "action",\n                "actionToken"\n              ],\n              when: {\n                setting: "interactionMode",\n                equals: "action"\n              }\n            },\n            {\n              kind: "accessibleNameWhenInteractive",\n              settings: [\n                "heading",\n                "label",\n                "header",\n                "ariaLabel"\n              ]\n            }\n          ],\n          responsive: {\n            supported: false\n          },\n          preview: {\n            renderer: "runtimeBinding",\n            navigation: "prevent",\n            eventHandlers: "observe-only"\n          },\n          eventBindings: {\n            handlerReference: "registered-handler-id",\n            cancellation: "synchronous-false-only",\n            selectionEvent: "uib-card-select"\n          }\n        },\n        capabilities: [\n          "surface",\n          "container",\n          "interactive",\n          "selectable",\n          "linkable"\n        ],\n        dependencies: {\n          packages: [\n            {\n              packageId: "@ui-base/core",\n              range: "^0.1.0"\n            },\n            {\n              packageId: "@ui-base/icons",\n              range: "^0.1.0"\n            }\n          ],\n          services: []\n        },\n        accessibility: {\n          modes: [\n            "section",\n            "link",\n            "button",\n            "toggle-button"\n          ],\n          keyboard: {\n            nonLink: [\n              "Enter",\n              "Space"\n            ],\n            link: "native"\n          },\n          namePrecedence: [\n            "aria-label",\n            "heading",\n            "label",\n            "header"\n          ],\n          disabled: "aria-disabled; remove-from-tab-order; block-activation"\n        },\n        lifecycle: {\n          state: "installed",\n          save: "workspace-only",\n          publication: "unimplemented-stage-gate",\n          publishedRevisionsImmutable: true,\n          rollback: "new-revision",\n          promotion: "new-identity-with-provenance"\n        },\n        clone: {\n          workspace: "new-workspace-and-instance-ids;same-component-identity",\n          component: "new-component-identity;retain-provenance"\n        },\n        deprecation: {\n          status: "none",\n          replacementComponentId: null\n        },\n        extensions: {}\n      },\n      {\n        tagName: "uib-panel",\n        module: "./src/layout/uib-panel.js",\n        importPath: "./panel",\n        presentation: {\n          settings: {\n            variant: {\n              type: "select",\n              options: [\n                "elevated",\n                "outlined",\n                "flat"\n              ],\n              inheritable: true\n            },\n            density: {\n              type: "select",\n              options: [\n                "comfortable",\n                "compact"\n              ],\n              inheritable: true\n            }\n          }\n        }\n      },\n      {\n        tagName: "uib-instruction",\n        module: "./src/content/uib-instruction.js",\n        importPath: "./instruction",\n        presentation: {\n          settings: {\n            density: {\n              type: "select",\n              options: [\n                "comfortable",\n                "compact"\n              ],\n              inheritable: true\n            }\n          }\n        }\n      },\n      {\n        tagName: "uib-action-group",\n        module: "./src/actions/uib-action-group.js",\n        importPath: "./action-group",\n        presentation: {\n          settings: {\n            align: {\n              type: "select",\n              options: [\n                "start",\n                "center",\n                "end"\n              ],\n              inheritable: true\n            }\n          }\n        }\n      }\n    ]\n  };\n\n  // packages/visual-artifacts/src/source.ts\n  var voidTags = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));\n  var optionalTags = new Set("p li dt dd rt rp option optgroup thead tbody tfoot tr td th".split(" "));\n  var blockTags = new Set("address article aside blockquote div dl fieldset footer form h1 h2 h3 h4 h5 h6 header hr main nav ol p pre section table ul".split(" "));\n\n  // packages/visual-artifacts/src/composition.ts\n  function routePath(route, params = {}) {\n    return route.path.replace(/:([A-Za-z][\\w]*)|\\[([A-Za-z][\\w]*)\\]/g, (_, colon, bracket) => {\n      const value = params[colon ?? bracket];\n      if (value === void 0) throw new Error(`Route parameter is required: ${colon ?? bracket}.`);\n      return encodeURIComponent(value);\n    });\n  }\n  function matchCompositionRoute(routes, pathname) {\n    for (const route of [...routes].sort((a, b) => Number(/:|\\[/.test(a.path)) - Number(/:|\\[/.test(b.path)))) {\n      const keys = [];\n      const pattern = route.path.split("/").map((part) => {\n        const parameter = /^(?::([A-Za-z][\\w]*)|\\[([A-Za-z][\\w]*)\\])$/.exec(part);\n        if (parameter) {\n          keys.push(parameter[1] ?? parameter[2]);\n          return "([^/]+)";\n        }\n        return part.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");\n      }).join("/");\n      const match = new RegExp(`^${pattern}/?$`).exec(pathname);\n      if (match) return { route, params: Object.fromEntries(keys.map((key, i) => [key, decodeURIComponent(match[i + 1])])) };\n    }\n    return void 0;\n  }\n\n  // src/client/fixture-preview/samples.ts\n  var FixtureDenied = class extends Error {\n    constructor(code) {\n      super(code);\n      this.code = code;\n    }\n    code;\n  };\n  function data(input) {\n    if (!input || typeof input !== "object" || Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw new FixtureDenied("SAMPLE_SCHEMA_UNSUPPORTED");\n    const descriptors = Object.getOwnPropertyDescriptors(input);\n    if (Reflect.ownKeys(input).length !== Object.keys(descriptors).length || Object.entries(descriptors).some(([key, value]) => ["__proto__", "constructor", "prototype"].includes(key) || value.get || value.set)) throw new FixtureDenied("SAMPLE_FIELDS_UNSUPPORTED");\n    return input;\n  }\n  function fields(input, required, optional = []) {\n    if (required.some((key) => !Object.hasOwn(input, key)) || Object.getOwnPropertyNames(input).some((key) => ![...required, ...optional].includes(key))) throw new FixtureDenied("SAMPLE_FIELDS_UNSUPPORTED");\n  }\n  function text(value, key, limit = 512) {\n    if (typeof value !== "string" || value.length > limit || /[\\u0000-\\u001f<>]/.test(value)) throw new FixtureDenied(`SAMPLE_TEXT_INVALID:${key}`);\n    return value;\n  }\n  function boolean(value) {\n    if (typeof value !== "boolean") throw new FixtureDenied("SAMPLE_PROPERTY_INVALID");\n    return value;\n  }\n  var surfaceKeys = ["fixture", "heading", "body", "footer", "variant", "density"];\n  var templates = Object.freeze({\n    person: Object.freeze({ routeId: "synthetic-person-route", pageId: "synthetic-person-page", path: "/people/:personId" }),\n    "project-item": Object.freeze({ routeId: "synthetic-project-route", pageId: "synthetic-project-page", path: "/projects/[projectId]/items/:itemId" })\n  });\n  function inspectRoute(sample) {\n    const route = templates[sample.template], path = routePath(route, sample.params);\n    const matched = matchCompositionRoute([route], path);\n    return { template: route.path, path, matched: matched?.params ?? null };\n  }\n  function validateSample(input) {\n    const value = data(input);\n    if (value.fixture === "route-inspector-v1") {\n      fields(value, ["fixture", "template", "params"]);\n      if (value.template !== "person" && value.template !== "project-item") throw new FixtureDenied("ROUTE_TEMPLATE_UNSUPPORTED");\n      const params = data(value.params), names = value.template === "person" ? ["personId"] : ["projectId", "itemId"];\n      fields(params, names);\n      const result = { fixture: value.fixture, template: value.template, params: Object.fromEntries(names.map((key) => {\n        const item = text(params[key], key, 128);\n        if (!item.trim()) throw new FixtureDenied(`ROUTE_PARAMETER_INVALID:${key}`);\n        try {\n          encodeURIComponent(item);\n        } catch {\n          throw new FixtureDenied(`ROUTE_PARAMETER_INVALID:${key}`);\n        }\n        return [key, item];\n      })) };\n      inspectRoute(result);\n      return result;\n    }\n    if (value.fixture !== "native-card-v1" && value.fixture !== "native-panel-v1") throw new FixtureDenied("FIXTURE_RENDERER_NOT_ADMITTED");\n    fields(value, [...surfaceKeys, ...value.fixture === "native-card-v1" ? ["selectable"] : ["collapsible", "open"]], value.fixture === "native-card-v1" ? ["header", "disabled", "selected"] : []);\n    const heading = text(value.heading, "heading"), body = text(value.body, "body"), footer = text(value.footer, "footer");\n    if (typeof value.variant !== "string" || !["outlined", "elevated", "flat"].includes(value.variant) || typeof value.density !== "string" || !["comfortable", "compact"].includes(value.density)) throw new FixtureDenied("SAMPLE_PROPERTY_INVALID");\n    const surface = { heading, body, footer, variant: value.variant, density: value.density };\n    if (value.fixture === "native-panel-v1") return { fixture: value.fixture, ...surface, collapsible: boolean(value.collapsible), open: boolean(value.open) };\n    const selectable = boolean(value.selectable), selected = boolean(Object.hasOwn(value, "selected") ? value.selected : false);\n    if (selected && !selectable) throw new FixtureDenied("CARD_SELECTED_REQUIRES_SELECTABLE");\n    return { fixture: value.fixture, ...surface, header: text(Object.hasOwn(value, "header") ? value.header : "", "header"), selectable, disabled: boolean(Object.hasOwn(value, "disabled") ? value.disabled : false), selected };\n  }\n  var unsupportedFixtures = Object.freeze({\n    component: "PLATFORM_COMPONENT_CAPTURE_UNAVAILABLE: protected capture prerequisites remain open",\n    package: "PACKAGE_NOT_ADMITTED: only Card and the native Panel layout fixture are admitted",\n    regions: "REGION_SCHEMA_UNSUPPORTED: composition rendering is not admitted",\n    route: "ROUTE_RENDERING_UNAVAILABLE: the pure inspector does not render Pages or Menus",\n    form: "FORM_MODE_UNSUPPORTED: create/edit Form renderer closure is not admitted",\n    source: "EXECUTABLE_SOURCE_DENIED: no source functions or imports",\n    resource: "RESOURCE_NOT_ADMITTED: no URL or external resource capability",\n    saved: "SAVED_CAPTURE_UNAVAILABLE: D6 acquisition and trusted revocation prerequisites remain open"\n  });\n\n  // src/client/fixture-preview/protocol.ts\n  function validChannel(value, expected) {\n    if (!value || typeof value !== "object") return false;\n    const v = value;\n    const fields2 = v.type === "render" ? ["nonce", "session", "identity", "sequence", "type", "sample"] : ["nonce", "session", "identity", "sequence", "type", ...v.reason === void 0 ? [] : ["reason"]];\n    return Object.keys(v).length === fields2.length && Object.keys(v).every((key) => fields2.includes(key)) && ["render", "ready", "unavailable"].includes(v.type) && v.nonce === expected.nonce && v.session === expected.session && v.identity === expected.identity && v.sequence === expected.sequence && Number.isSafeInteger(v.sequence) && v.sequence > 0 && (v.reason === void 0 || typeof v.reason === "string" && v.reason.length <= 256);\n  }\n\n  // src/client/fixture-preview/frame.ts\n  var channel = JSON.parse(document.documentElement.dataset.channel);\n  var parentOrigin = document.documentElement.dataset.parentOrigin;\n  var rendered = false;\n  document.addEventListener("submit", (event) => event.preventDefault(), true);\n  document.addEventListener("click", (event) => {\n    if (event.composedPath().some((item) => item instanceof Element && item.matches("a, input[type=file], [download]"))) event.preventDefault();\n  }, true);\n  document.addEventListener("dragover", (event) => event.preventDefault(), true);\n  document.addEventListener("drop", (event) => event.preventDefault(), true);\n  window.addEventListener("message", (event) => {\n    if (event.source !== parent || event.origin !== parentOrigin || !validChannel(event.data, channel) || event.data.type !== "render" || rendered) return;\n    rendered = true;\n    try {\n      const sample = validateSample(event.data.sample);\n      let element;\n      if (sample.fixture === "native-card-v1") {\n        const definition = ui_component_default.components.find((entry) => entry.schemaVersion && entry.tagName === "uib-card");\n        const registry = new ComponentRegistry();\n        registry.registerManifest({ components: [definition] }, { packageId: "@ui-base/ui" });\n        element = renderComponentInstance(definition, {\n          componentId: definition.identity.componentId,\n          settings: { heading: sample.heading, header: sample.header, body: sample.body, footer: sample.footer, variant: sample.variant, density: sample.density, interactionMode: sample.selectable ? "selectable" : "none", disabled: sample.disabled, selected: sample.selected, ariaLabel: sample.heading || "Synthetic Card" }\n        }, { registry, preview: true });\n      } else if (sample.fixture === "native-panel-v1") {\n        element = document.createElement("uib-panel");\n        if (!(element instanceof UibPanel)) throw new Error("PANEL_NATIVE_CLASS_UNAVAILABLE");\n        for (const key of ["heading", "variant", "density"]) element.setAttribute(key, sample[key]);\n        element.toggleAttribute("collapsible", sample.collapsible);\n        element.toggleAttribute("open", sample.open);\n        for (const [slot, text2] of [["", sample.body], ["footer", sample.footer]]) {\n          const child = document.createElement("span");\n          if (slot) child.slot = slot;\n          child.textContent = text2;\n          element.append(child);\n        }\n      } else {\n        element = document.createElement("pre");\n        element.inert = true;\n        element.textContent = JSON.stringify(inspectRoute(sample), null, 2);\n      }\n      const label = document.createElement("strong");\n      label.textContent = `SAMPLE DATA \\xB7 ${sample.fixture === "native-panel-v1" ? "Native Panel layout fixture \\xB7 not canonical Component parity" : sample.fixture === "route-inspector-v1" ? "Synthetic route-parameter inspector \\xB7 no Page rendering or navigation" : "Card fixture demonstration"}`;\n      document.body.replaceChildren(label, element);\n      parent.postMessage({ ...channel, type: "ready" }, parentOrigin);\n    } catch {\n      document.body.textContent = "Fixture unavailable";\n      parent.postMessage({ ...channel, type: "unavailable", reason: "NATIVE_RENDERER_REJECTED_FIXTURE" }, parentOrigin);\n    }\n  });\n})();\n';

  // src/client/fixture-preview/samples.ts
  var FixtureDenied = class extends Error {
    constructor(code) {
      super(code);
      this.code = code;
    }
    code;
  };
  var defaultSample = () => ({ fixture: "native-card-v1", heading: "Synthetic Card", header: "", body: "Authored synthetic slot text", footer: "Synthetic footer", variant: "outlined", density: "comfortable", selectable: true, disabled: false, selected: false });
  var defaultPanelSample = () => ({ fixture: "native-panel-v1", heading: "Synthetic Panel", body: "Synthetic Panel body", footer: "Synthetic Panel footer", variant: "outlined", density: "comfortable", collapsible: true, open: true });
  var defaultRouteSample = () => ({ fixture: "route-inspector-v1", template: "person", params: { personId: "synthetic person" } });
  function data(input2) {
    if (!input2 || typeof input2 !== "object" || Array.isArray(input2) || ![Object.prototype, null].includes(Object.getPrototypeOf(input2))) throw new FixtureDenied("SAMPLE_SCHEMA_UNSUPPORTED");
    const descriptors = Object.getOwnPropertyDescriptors(input2);
    if (Reflect.ownKeys(input2).length !== Object.keys(descriptors).length || Object.entries(descriptors).some(([key, value]) => ["__proto__", "constructor", "prototype"].includes(key) || value.get || value.set)) throw new FixtureDenied("SAMPLE_FIELDS_UNSUPPORTED");
    return input2;
  }
  function fields(input2, required, optional = []) {
    if (required.some((key) => !Object.hasOwn(input2, key)) || Object.getOwnPropertyNames(input2).some((key) => ![...required, ...optional].includes(key))) throw new FixtureDenied("SAMPLE_FIELDS_UNSUPPORTED");
  }
  function text(value, key, limit = 512) {
    if (typeof value !== "string" || value.length > limit || /[\u0000-\u001f<>]/.test(value)) throw new FixtureDenied(`SAMPLE_TEXT_INVALID:${key}`);
    return value;
  }
  function boolean(value) {
    if (typeof value !== "boolean") throw new FixtureDenied("SAMPLE_PROPERTY_INVALID");
    return value;
  }
  var surfaceKeys = ["fixture", "heading", "body", "footer", "variant", "density"];
  var templates = Object.freeze({
    person: Object.freeze({ routeId: "synthetic-person-route", pageId: "synthetic-person-page", path: "/people/:personId" }),
    "project-item": Object.freeze({ routeId: "synthetic-project-route", pageId: "synthetic-project-page", path: "/projects/[projectId]/items/:itemId" })
  });
  function inspectRoute(sample) {
    const route = templates[sample.template], path = routePath(route, sample.params);
    const matched = matchCompositionRoute([route], path);
    return { template: route.path, path, matched: matched?.params ?? null };
  }
  function validateSample(input2) {
    const value = data(input2);
    if (value.fixture === "route-inspector-v1") {
      fields(value, ["fixture", "template", "params"]);
      if (value.template !== "person" && value.template !== "project-item") throw new FixtureDenied("ROUTE_TEMPLATE_UNSUPPORTED");
      const params = data(value.params), names = value.template === "person" ? ["personId"] : ["projectId", "itemId"];
      fields(params, names);
      const result = { fixture: value.fixture, template: value.template, params: Object.fromEntries(names.map((key) => {
        const item = text(params[key], key, 128);
        if (!item.trim()) throw new FixtureDenied(`ROUTE_PARAMETER_INVALID:${key}`);
        try {
          encodeURIComponent(item);
        } catch {
          throw new FixtureDenied(`ROUTE_PARAMETER_INVALID:${key}`);
        }
        return [key, item];
      })) };
      inspectRoute(result);
      return result;
    }
    if (value.fixture !== "native-card-v1" && value.fixture !== "native-panel-v1") throw new FixtureDenied("FIXTURE_RENDERER_NOT_ADMITTED");
    fields(value, [...surfaceKeys, ...value.fixture === "native-card-v1" ? ["selectable"] : ["collapsible", "open"]], value.fixture === "native-card-v1" ? ["header", "disabled", "selected"] : []);
    const heading = text(value.heading, "heading"), body = text(value.body, "body"), footer = text(value.footer, "footer");
    if (typeof value.variant !== "string" || !["outlined", "elevated", "flat"].includes(value.variant) || typeof value.density !== "string" || !["comfortable", "compact"].includes(value.density)) throw new FixtureDenied("SAMPLE_PROPERTY_INVALID");
    const surface = { heading, body, footer, variant: value.variant, density: value.density };
    if (value.fixture === "native-panel-v1") return { fixture: value.fixture, ...surface, collapsible: boolean(value.collapsible), open: boolean(value.open) };
    const selectable = boolean(value.selectable), selected = boolean(Object.hasOwn(value, "selected") ? value.selected : false);
    if (selected && !selectable) throw new FixtureDenied("CARD_SELECTED_REQUIRES_SELECTABLE");
    return { fixture: value.fixture, ...surface, header: text(Object.hasOwn(value, "header") ? value.header : "", "header"), selectable, disabled: boolean(Object.hasOwn(value, "disabled") ? value.disabled : false), selected };
  }
  function sampleSummary(sample) {
    if (sample.fixture === "route-inspector-v1") return JSON.stringify(inspectRoute(sample), null, 2);
    return [sample.heading, sample.fixture === "native-card-v1" ? sample.header : "", sample.body, sample.footer].filter(Boolean).join("\n");
  }
  var unsupportedFixtures = Object.freeze({
    component: "PLATFORM_COMPONENT_CAPTURE_UNAVAILABLE: protected capture prerequisites remain open",
    package: "PACKAGE_NOT_ADMITTED: only Card and the native Panel layout fixture are admitted",
    regions: "REGION_SCHEMA_UNSUPPORTED: composition rendering is not admitted",
    route: "ROUTE_RENDERING_UNAVAILABLE: the pure inspector does not render Pages or Menus",
    form: "FORM_MODE_UNSUPPORTED: create/edit Form renderer closure is not admitted",
    source: "EXECUTABLE_SOURCE_DENIED: no source functions or imports",
    resource: "RESOURCE_NOT_ADMITTED: no URL or external resource capability",
    saved: "SAVED_CAPTURE_UNAVAILABLE: D6 acquisition and trusted revocation prerequisites remain open"
  });

  // src/client/fixture-preview/protocol.ts
  function validChannel(value, expected) {
    if (!value || typeof value !== "object") return false;
    const v = value;
    const fields3 = v.type === "render" ? ["nonce", "session", "identity", "sequence", "type", "sample"] : ["nonce", "session", "identity", "sequence", "type", ...v.reason === void 0 ? [] : ["reason"]];
    return Object.keys(v).length === fields3.length && Object.keys(v).every((key) => fields3.includes(key)) && ["render", "ready", "unavailable"].includes(v.type) && v.nonce === expected.nonce && v.session === expected.session && v.identity === expected.identity && v.sequence === expected.sequence && Number.isSafeInteger(v.sequence) && v.sequence > 0 && (v.reason === void 0 || typeof v.reason === "string" && v.reason.length <= 256);
  }

  // src/client/fixture-preview/host.ts
  var attribute = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
  async function digest2(value) {
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return btoa(String.fromCharCode(...new Uint8Array(bytes)));
  }
  async function fixtureCaptureId(sample) {
    return `fixture-sha256:${await digest2(JSON.stringify({ policy: "fixture-sample-policy-v2", renderer: await digest2(bootstrap_default), sample }))}`;
  }
  async function fixtureDocument(channel, parentOrigin) {
    const script = bootstrap_default.replace(/<\/script/gi, "<\\/script");
    const hash = await digest2(script);
    const csp = `default-src 'none'; script-src 'sha256-${hash}'; script-src-attr 'none'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; font-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'`;
    return `<!doctype html><html data-channel="${attribute(JSON.stringify(channel))}" data-parent-origin="${attribute(parentOrigin)}"><head><meta http-equiv="Content-Security-Policy" content="${attribute(csp)}"><meta name="referrer" content="no-referrer"><title>Restricted fixture</title></head><body><script>${script}<\/script></body></html>`;
  }
  var FixtureHost = class {
    constructor(container) {
      this.container = container;
    }
    container;
    frame;
    cancel;
    clear() {
      this.cancel?.();
      this.cancel = void 0;
      this.frame?.remove();
      this.frame = void 0;
      this.container.replaceChildren();
    }
    async render(identity, sequence, input2) {
      this.clear();
      const sample = validateSample(input2);
      const frame = document.createElement("iframe");
      this.frame = frame;
      frame.title = "Restricted fixture Preview";
      frame.setAttribute("sandbox", "allow-scripts");
      frame.referrerPolicy = "no-referrer";
      frame.setAttribute("credentialless", "");
      frame.style.cssText = "width:100%;height:260px;border:1px solid #aaa";
      const channel = { nonce: crypto.randomUUID(), session: crypto.randomUUID(), identity: identityKey(identity), sequence };
      const source2 = await fixtureDocument(channel, location.origin);
      if (this.frame !== frame) throw new Error("FIXTURE_RENDER_CANCELED");
      return new Promise((resolve, reject) => {
        const finish = (error) => {
          clearTimeout(timer);
          window.removeEventListener("message", receive);
          frame.onload = null;
          if (this.frame === frame) this.cancel = void 0;
          if (error) {
            frame.remove();
            reject(new Error(error));
          } else resolve();
        };
        const receive = (event) => {
          if (this.frame !== frame || event.source !== frame.contentWindow || event.origin !== "null" || !validChannel(event.data, channel) || event.data.type === "render") return;
          finish(event.data.type === "ready" ? void 0 : event.data.reason ?? "FIXTURE_UNAVAILABLE");
        };
        const timer = setTimeout(() => finish("FIXTURE_BOOTSTRAP_UNAVAILABLE"), 5e3);
        this.cancel = () => finish("FIXTURE_RENDER_CANCELED");
        window.addEventListener("message", receive);
        frame.onload = () => frame.contentWindow?.postMessage({ ...channel, type: "render", sample }, "*");
        frame.srcdoc = source2;
        this.container.replaceChildren(frame);
      });
    }
  };

  // src/client/fixture-preview/panel.ts
  var FixturePreviewPanel = class {
    element = document.createElement("section");
    lifecycle;
    host;
    dirty = false;
    status;
    identity;
    capture;
    view;
    sample;
    kind;
    constructor() {
      this.element.setAttribute("aria-label", "Fixture Preview");
      this.element.style.cssText = "padding:16px;border:1px solid #aab8cc;border-radius:8px;margin-top:16px;overflow-wrap:anywhere";
      this.element.innerHTML = `<h3>Preview \xB7 Fixture demonstration</h3><p>Fixture mode \xB7 SAMPLE DATA \xB7 Saved-artifact Preview unavailable</p><p data-identity></p><p data-capture></p><p data-state role="status"></p><label>Sample type<select data-fixture><option value="card">Native Card</option><option value="panel">Native Panel layout fixture</option><option value="route">Synthetic route-parameter inspector</option></select></label><label>Synthetic sample (JSON)<textarea data-sample rows="8"></textarea></label><button type="button" data-refresh>Refresh fixture</button><button type="button" data-saved>Preview saved artifact</button><details><summary>Unsupported fixture contracts</summary><ul></ul></details><div data-view></div>`;
      const get = (selector) => this.element.querySelector(selector);
      this.status = get("[data-state]");
      this.identity = get("[data-identity]");
      this.capture = get("[data-capture]");
      this.view = get("[data-view]");
      this.host = new FixtureHost(this.view);
      this.sample = get("[data-sample]");
      this.kind = get("[data-fixture]");
      this.kind.onchange = () => {
        this.invalidate("FIXTURE_KIND_CHANGED: explicit Refresh required");
        this.sample.value = JSON.stringify(this.defaults(), null, 2);
      };
      this.sample.style.cssText = "display:block;width:min(100%,640px);box-sizing:border-box;font-family:monospace";
      this.sample.value = JSON.stringify(defaultSample(), null, 2);
      this.sample.addEventListener("input", () => {
        this.invalidate("SAMPLE_CHANGED: explicit Refresh required");
      });
      get("[data-refresh]").onclick = () => {
        void this.refresh();
      };
      get("[data-saved]").onclick = () => {
        this.invalidate(unsupportedFixtures.saved);
      };
      for (const reason of Object.values(unsupportedFixtures)) {
        const item = document.createElement("li");
        item.textContent = reason;
        get("ul").append(item);
      }
      this.present();
    }
    defaults() {
      return this.kind.value === "panel" ? defaultPanelSample() : this.kind.value === "route" ? defaultRouteSample() : defaultSample();
    }
    select(identity, dirty = false) {
      const previous = this.lifecycle?.snapshot;
      if (!identity || !previous || identityKey(previous.identity) !== identityKey(identity)) {
        this.host.clear();
        this.lifecycle?.dispose();
        this.lifecycle = identity ? new PreviewLifecycle(identity) : void 0;
        this.sample.value = identity ? JSON.stringify(this.defaults(), null, 2) : "";
      }
      this.dirty = dirty;
      this.present();
    }
    present() {
      const state = this.lifecycle?.snapshot;
      this.sample.disabled = !state || state.state === "revoked" || state.state === "disposed";
      this.kind.disabled = this.sample.disabled;
      this.element.dataset.state = state?.state ?? "empty";
      this.identity.textContent = state ? `Original selection \xB7 ${identityKey(state.identity)}` : "Select an authorized artifact to identify this fixture session.";
      this.capture.textContent = state?.last ? `${state.last.provenance.kind === "fixture" ? "Fixture demonstration" : `Saved revision ${state.last.provenance.revision}`} \xB7 Capture ${state.last.captureId}${state.pending ? ` \xB7 Pending ${state.pending.requestId}` : ""}` : state?.pending ? `Pending ${state.pending.requestId} \xB7 No successful capture` : "No successful capture";
      this.status.textContent = `${state?.state ?? "empty"}${state?.reason ? ` \xB7 ${state.reason}` : ""}${this.dirty ? " \xB7 Unsaved changes excluded; editor autosave remains independently governed." : ""}`;
    }
    retainedSummary() {
      const last = this.lifecycle?.snapshot.last;
      this.host.clear();
      if (last) {
        const summary = document.createElement("pre");
        summary.textContent = `STALE PREVIEW \xB7 SAMPLE DATA \xB7 Static sample summary (rendering destroyed)
${sampleSummary(last.content)}`;
        summary.style.whiteSpace = "pre-wrap";
        summary.inert = true;
        this.view.append(summary);
      }
    }
    invalidate(reason) {
      this.lifecycle?.invalidate(reason);
      this.retainedSummary();
      this.present();
    }
    revoke(reason = "SIMULATED_REVOCATION") {
      this.lifecycle?.revoke(reason);
      this.host.clear();
      this.sample.value = "";
      this.present();
    }
    dispose() {
      this.lifecycle?.dispose();
      this.host.clear();
      this.sample.value = "";
      this.present();
    }
    async refresh() {
      const lifecycle = this.lifecycle;
      if (!lifecycle || ["disposed", "revoked"].includes(lifecycle.snapshot.state)) return;
      this.retainedSummary();
      const request = lifecycle.refresh();
      this.present();
      try {
        if (this.sample.value.length > 4096) throw new Error("SAMPLE_INPUT_LIMIT_EXCEEDED");
        const sample = validateSample(JSON.parse(this.sample.value));
        const captureId = await fixtureCaptureId(sample);
        if (this.lifecycle !== lifecycle || lifecycle.snapshot.pending?.sequence !== request.sequence) return;
        await this.host.render(request.identity, request.sequence, sample);
        if (this.lifecycle !== lifecycle) return;
        if (lifecycle.succeed(request, { identity: request.identity, captureId, provenance: { kind: "fixture", fixtureId: sample.fixture }, content: sample })) this.present();
      } catch (error) {
        if (this.lifecycle === lifecycle && lifecycle.fail(request, error instanceof Error ? error.message : "FIXTURE_UNAVAILABLE")) {
          this.retainedSummary();
          this.present();
        }
      }
    }
  };

  // src/client/builder-workspace/fixture-preview-binding.ts
  function selectFixturePreview(panel, hints) {
    panel.select(hints ? { subjectId: hints.subjectId, sessionId: hints.sessionId, applicationId: hints.artifact.applicationId, artifactKey: workspaceIdentityKey(hints.artifact.identity) } : void 0, hints?.dirty ?? false);
  }

  // src/shared/saved-preview-request.ts
  var SavedPreviewRequestError = class extends Error {
    constructor() {
      super("SAVED_PREVIEW_REQUEST_INVALID");
    }
  };
  function invalid() {
    throw new SavedPreviewRequestError();
  }
  function fields2(v, required, optional = []) {
    if (!v || typeof v !== "object" || Array.isArray(v) || ![Object.prototype, null].includes(Object.getPrototypeOf(v))) invalid();
    const d = Object.getOwnPropertyDescriptors(v);
    if (Reflect.ownKeys(v).some((k) => typeof k !== "string") || Object.entries(d).some(([k, p]) => !p.enumerable || !("value" in p) || ![...required, ...optional].includes(k)) || required.some((k) => !Object.hasOwn(d, k))) invalid();
  }
  var text2 = (v) => typeof v === "string" && v.length > 0;
  function parseSavedPreviewSelection(value) {
    fields2(value, ["subjectId", "sessionRevision", "applicationId", "applicationKey", "identity", "kind", "dirty"], ["sourceNode", "ownerSelection"]);
    for (const k of ["subjectId", "sessionRevision", "applicationId", "applicationKey", "kind"]) if (!text2(value[k])) invalid();
    if (typeof value.dirty !== "boolean") invalid();
    fields2(value.identity, ["owner", "format"], ["id", "repairLocator"]);
    const identity = value.identity;
    fields2(identity.owner, ["kind", "id"], ["revision"]);
    const owner = identity.owner;
    if (!["application", "platform", "package"].includes(String(owner.kind)) || !text2(owner.id) || owner.revision !== void 0 && !text2(owner.revision)) invalid();
    if (!["visual", "generic", "composition", "automation", "package", "legacy"].includes(String(identity.format))) invalid();
    if (!!identity.id === !!identity.repairLocator || identity.id !== void 0 && !text2(identity.id) || identity.repairLocator !== void 0 && !text2(identity.repairLocator)) invalid();
    if (owner.kind === "application" && owner.id !== value.applicationId) invalid();
    if (value.sourceNode !== void 0) {
      fields2(value.sourceNode, ["nodeId", "savedRevision"]);
      if (!text2(value.sourceNode.nodeId) || !text2(value.sourceNode.savedRevision)) invalid();
    }
    if (value.ownerSelection !== void 0) {
      fields2(value.ownerSelection, ["state", "reason", "generation", "target"]);
      const selected = value.ownerSelection;
      fields2(selected.generation, ["selection", "source"]);
      for (const v of Object.values(selected.generation)) if (!Number.isSafeInteger(v) || Number(v) < 0) invalid();
      if (selected.state === "unavailable") {
        if (!text2(selected.reason) || selected.target !== null || value.sourceNode !== void 0) invalid();
      } else if (selected.state === "identified") {
        if (selected.reason !== "RETAINED_SAVED_VERSION_ONLY" || value.kind !== "page") invalid();
        fields2(selected.target, ["source", "implementation", "context"]);
        const target = selected.target;
        fields2(target.source, ["applicationId", "page", "committedHash", "nodeId"]);
        const source2 = target.source;
        fields2(source2.page, ["owner", "format", "id"]);
        fields2(source2.page.owner, ["kind", "id"], ["revision"]);
        if (source2.page.format !== "visual" || source2.page.owner.kind !== "application" || !text2(source2.page.id) || !text2(source2.page.owner.id) || source2.page.owner.revision !== void 0 && !text2(source2.page.owner.revision)) invalid();
        if (source2.applicationId !== value.applicationId || source2.page.owner.id !== value.applicationId || workspaceIdentityKey(source2.page) !== workspaceIdentityKey(identity)) invalid();
        if (!text2(source2.committedHash) || !/^([a-f0-9]{64})$/.test(source2.committedHash) || !text2(source2.nodeId)) invalid();
        fields2(target.context, ["subjectId", "sessionRevision"]);
        if (target.context.subjectId !== value.subjectId || target.context.sessionRevision !== value.sessionRevision) invalid();
        fields2(target.implementation, ["componentId", "packageId", "packageVersion", "importPath", "exportName", "definitionRevision"]);
        for (const [k, v] of Object.entries(target.implementation)) if (k === "definitionRevision" ? v !== null && !text2(v) : !text2(v)) invalid();
        fields2(value.sourceNode, ["nodeId", "savedRevision"]);
        if (value.sourceNode.nodeId !== source2.nodeId || value.sourceNode.savedRevision !== source2.committedHash) invalid();
      } else invalid();
    }
    const result = JSON.parse(JSON.stringify(value));
    workspaceIdentityKey(result.identity);
    return result;
  }
  function parseSavedPreviewRequest(value) {
    fields2(value, ["schema", "generation", "trigger", "selection"]);
    if (value.schema !== "saved-preview-request-v1" || value.trigger !== "explicit-check" || !Number.isSafeInteger(value.generation) || Number(value.generation) < 0) invalid();
    return { schema: "saved-preview-request-v1", generation: value.generation, trigger: "explicit-check", selection: value.selection === null ? null : parseSavedPreviewSelection(value.selection) };
  }
  function savedPreviewSelectionKey(s) {
    return JSON.stringify([s.subjectId, s.sessionRevision, s.applicationId, s.applicationKey, workspaceIdentityKey(s.identity), s.kind, s.sourceNode?.nodeId ?? null, s.sourceNode?.savedRevision ?? null, s.ownerSelection ?? null]);
  }
  function productionSavedPreviewUnavailable(request) {
    const s = parseSavedPreviewRequest(request).selection;
    const code = !s ? "NO_SELECTION" : s.identity.repairLocator ? "REPAIR_ONLY_IDENTITY" : s.identity.owner.kind === "package" || s.identity.format === "package" ? "PACKAGE_DEFINITION_ONLY" : s.identity.format !== "visual" || !["page", "shell", "component", "form"].includes(s.kind) ? "UNSUPPORTED_ARTIFACT" : s.ownerSelection?.state === "unavailable" ? "SOURCE_OWNER_UNAVAILABLE" : !s.sourceNode ? "SAVED_NODE_UNRESOLVED" : "PROVIDER_NOT_QUALIFIED";
    return { kind: "unavailable", code };
  }
  var savedPreviewUnavailableText = {
    NO_SELECTION: "No selected artifact.",
    REPAIR_ONLY_IDENTITY: "Repair-only identity cannot identify a saved Preview.",
    UNRESOLVED_IDENTITY: "Original selection identity is unresolved.",
    PACKAGE_DEFINITION_ONLY: "Installed package Definition selected; no saved instance selected.",
    SAVED_NODE_UNRESOLVED: "Saved source node is unresolved; no node was inferred.",
    UNSUPPORTED_ARTIFACT: "This artifact is unsupported for saved Preview.",
    PROVIDER_NOT_QUALIFIED: "Production capture/provider is not qualified.",
    SOURCE_OWNER_UNAVAILABLE: "The source owner has no eligible retained saved Card target."
  };

  // src/client/builder-workspace/saved-preview-request.ts
  var copy = (v) => JSON.parse(JSON.stringify(v));
  var SavedPreviewRequestController = class {
    value = { state: "idle", generation: 0, reason: "Select an artifact to check local readiness.", selection: null, request: null, outcome: null };
    listeners = /* @__PURE__ */ new Set();
    completion;
    unresolvedIdentity = false;
    constructor(completion = () => Promise.resolve()) {
      this.completion = completion;
    }
    get snapshot() {
      return copy(this.value);
    }
    subscribe(listener) {
      if (this.value.state === "disposed") return () => {
      };
      this.listeners.add(listener);
      listener(this.snapshot);
      return () => {
        this.listeners.delete(listener);
      };
    }
    emit() {
      for (const listener of this.listeners) listener(this.snapshot);
    }
    cancel(state, reason, clearSelection = false) {
      this.value = { ...this.value, state, generation: this.value.generation + 1, reason, request: null, outcome: null, ...clearSelection ? { selection: null } : {} };
      this.emit();
    }
    select(input2, forceInvalidation = false) {
      if (this.value.state === "disposed") return;
      if (forceInvalidation && ["parked", "suspended"].includes(this.value.state)) return;
      let selected = null;
      try {
        if (input2 !== void 0 && input2 !== null) selected = parseSavedPreviewSelection(input2);
      } catch {
        this.unresolvedIdentity = true;
        this.cancel("unavailable", "Invalid original identity.", true);
        this.value.outcome = { kind: "unavailable", code: "UNRESOLVED_IDENTITY" };
        this.emit();
        return;
      }
      this.unresolvedIdentity = false;
      const changed = (selected ? savedPreviewSelectionKey(selected) : null) !== (this.value.selection ? savedPreviewSelectionKey(this.value.selection) : null);
      if (changed || forceInvalidation) {
        this.value.selection = selected;
        this.cancel("idle", "Original selection changed; explicit check required.");
      } else {
        this.value.selection = selected;
        if (selected && ["parked", "suspended"].includes(this.value.state)) this.cancel("idle", "Selection restored; explicit check required.");
        else this.emit();
      }
    }
    async check() {
      if (["disposed", "parked", "suspended"].includes(this.value.state)) return;
      const generation = this.value.generation + 1;
      const unresolvedIdentity = this.unresolvedIdentity;
      const request = { schema: "saved-preview-request-v1", generation, trigger: "explicit-check", selection: this.value.selection ? copy(this.value.selection) : null };
      this.value = { ...this.value, state: "pending", generation, reason: "Checking local prerequisites only; no source acquisition.", request, outcome: null };
      this.emit();
      try {
        await this.completion();
      } catch {
      }
      if (this.value.generation !== generation || this.value.state !== "pending") return;
      const outcome = unresolvedIdentity ? { kind: "unavailable", code: "UNRESOLVED_IDENTITY" } : productionSavedPreviewUnavailable(request);
      this.value = { ...this.value, state: "unavailable", reason: "Readiness is not authorization or available rendering.", outcome };
      this.emit();
      return copy(outcome);
    }
    sourceChanged(reason = "Saved source changed; explicit check required.") {
      if (this.value.state !== "disposed") this.cancel(this.value.state === "parked" ? "parked" : this.value.state === "suspended" ? "suspended" : "idle", reason);
    }
    park() {
      if (this.value.state !== "disposed") this.cancel("parked", "Workspace parked.", true);
    }
    resume() {
      if (this.value.state === "parked") this.cancel("idle", "Workspace mounted; explicit check required.");
    }
    suspend(reason = "Session or owner changed.") {
      if (this.value.state !== "disposed") this.cancel("suspended", reason, true);
    }
    dispose() {
      if (this.value.state !== "disposed") {
        this.cancel("disposed", "Saved readiness disposed.", true);
        this.listeners.clear();
      }
    }
  };

  // evidence/builder-v1-wp5-f-card-request-integration-20261026/shell-view.ts.before.txt
  var shellTabLabel = (tab) => tab.suspended ? "Suspended artifact" : `${tab.artifact.name}${tab.state.dirty ? " \u2022" : ""}${tab.state.pending ? " (pending)" : ""}${tab.state.conflict ? " (conflict)" : ""}`;
  var groups = ["Pages", "Shells", "Components and Forms", "Datasets", "Workflows", "Triggers", "Menus", "Application presentation/settings", "Other artifacts"];
  function createBuilderShellView(actions, savedPreview = new SavedPreviewRequestController()) {
    const element = document.createElement("section");
    element.className = "builder-workspace";
    element.setAttribute("aria-label", "Application Builder workspace");
    element.innerHTML = `<header><button data-collapse aria-expanded="true">Application navigation</button><strong data-title></strong><button data-refresh>Refresh artifacts</button><button data-create-dataset>Create Dataset</button><button data-create-form>Create Form</button><button data-return-link hidden>Return and link Dataset to Form</button><button data-cancel-link hidden>Cancel Dataset link</button></header>
    <p data-status role="status"></p><div class="workspace-layout"><nav aria-label="Application artifacts"></nav><section class="workspace-main"><div role="tablist" aria-label="Open artifacts"></div><div data-stage></div></section></div>`;
    const find = (selector) => element.querySelector(selector);
    const preview = new FixturePreviewPanel();
    element.append(preview.element);
    const savedSection = document.createElement("section");
    savedSection.setAttribute("aria-label", "Saved Preview readiness");
    const savedHeading = document.createElement("h3");
    savedHeading.textContent = "Saved Preview \xB7 unavailable";
    const savedCheck = document.createElement("button");
    savedCheck.textContent = "Check saved Preview availability";
    savedCheck.dataset.viewAction = "saved-check";
    const savedStatus = document.createElement("p");
    savedStatus.setAttribute("role", "status");
    savedStatus.dataset.savedPreviewStatus = "";
    savedSection.append(savedHeading, savedCheck, savedStatus);
    element.append(savedSection);
    const unsubscribeSaved = savedPreview.subscribe((value) => {
      savedCheck.disabled = ["parked", "suspended", "disposed"].includes(value.state);
      savedStatus.textContent = `Saved-artifact rendering is unavailable. ${value.outcome ? savedPreviewUnavailableText[value.outcome.code] : value.reason}${value.selection?.dirty ? " Unsaved changes are excluded; editor autosave remains unchanged." : ""}`;
      savedSection.dataset.state = value.state;
      savedSection.dataset.code = value.outcome?.code ?? "";
    });
    let mounted = false, disposed = false;
    let state = { active: false, applicationKey: "", tabs: [] };
    let navigation = /* @__PURE__ */ new Map();
    function click(event) {
      if (!mounted || disposed || !(event.target instanceof Element)) return;
      const button2 = event.target.closest("button[data-view-action]");
      if (!button2 || !element.contains(button2)) return;
      const key = button2.dataset.viewKey;
      if (button2.dataset.viewAction === "saved-check") {
        void savedPreview.check();
      } else if (button2.dataset.viewAction === "collapse") {
        const nav = find("nav");
        nav.hidden = !nav.hidden;
        button2.setAttribute("aria-expanded", String(!nav.hidden));
        element.classList.toggle("navigation-collapsed", nav.hidden);
      } else if (button2.dataset.viewAction === "artifact") {
        const artifact = navigation.get(key);
        if (artifact) actions.navigate({ identity: artifact.identity });
      } else if (button2.dataset.viewAction === "tab") {
        const tab = state.tabs.find((tab2) => tab2.key === key);
        if (tab) actions.navigate({ identity: tab.artifact.identity }, tab.artifact.identity.owner.kind === "application" ? tab.artifact.applicationKey : state.applicationKey);
      } else if (button2.dataset.viewAction === "close" && state.tabs.some((tab) => tab.key === key)) actions.close(key);
    }
    find("[data-collapse]").dataset.viewAction = "collapse";
    function render2(next) {
      if (disposed) return;
      state = next;
      const tabs = find("[role=tablist]");
      tabs.replaceChildren();
      for (const tab of next.tabs) {
        const row = document.createElement("span"), button2 = document.createElement("button"), close = document.createElement("button");
        button2.setAttribute("role", "tab");
        button2.setAttribute("aria-selected", String(next.focused === tab.key));
        button2.textContent = shellTabLabel(tab);
        button2.dataset.viewAction = "tab";
        button2.dataset.viewKey = tab.key;
        close.textContent = "\xD7";
        close.setAttribute("aria-label", `Close ${tab.suspended ? "suspended artifact" : tab.artifact.name}`);
        close.dataset.viewAction = "close";
        close.dataset.viewKey = tab.key;
        row.append(button2, close);
        tabs.append(row);
      }
      const stage = find("[data-stage]"), focused = next.tabs.find((tab) => tab.key === next.focused);
      if (mounted && next.active && focused && !focused.suspended) {
        if (stage.firstElementChild !== focused.element) stage.replaceChildren(focused.element);
      } else stage.replaceChildren();
      selectFixturePreview(preview, mounted && next.active && focused && !focused.suspended && next.session?.principal ? {
        subjectId: next.session.principal.subjectId,
        sessionId: next.session.revision,
        artifact: focused.artifact,
        dirty: focused.state.dirty
      } : void 0);
      savedPreview.select(mounted && next.active && focused && !focused.suspended && next.session?.principal ? {
        subjectId: next.session.principal.subjectId,
        sessionRevision: next.session.revision,
        applicationId: focused.artifact.applicationId,
        applicationKey: focused.artifact.applicationKey,
        identity: focused.artifact.identity,
        kind: focused.artifact.kind,
        dirty: focused.state.dirty
      } : void 0);
    }
    return {
      element,
      preview,
      savedPreview,
      status(message) {
        if (!disposed) find("[data-status]").textContent = message;
      },
      title(message) {
        if (!disposed) find("[data-title]").textContent = message;
      },
      artifacts(entries) {
        if (disposed) return;
        navigation = new Map(entries.map((artifact) => [workspaceIdentityKey(artifact.identity), artifact]));
        const nav = find("nav");
        nav.replaceChildren();
        for (const group of groups) {
          const matching = entries.filter((item) => item.group === group);
          if (!matching.length) continue;
          const details = document.createElement("details");
          details.open = true;
          const heading = document.createElement("summary");
          heading.textContent = group;
          details.append(heading);
          for (const artifact of matching) {
            const button2 = document.createElement("button");
            button2.textContent = `${artifact.name}${artifact.identity.repairLocator ? " (repair-only locator)" : ""}${!artifact.editable ? " (read-only)" : ""}`;
            button2.dataset.artifactKey = workspaceIdentityKey(artifact.identity);
            button2.dataset.viewAction = "artifact";
            button2.dataset.viewKey = button2.dataset.artifactKey;
            details.append(button2);
          }
          nav.append(details);
        }
      },
      render: render2,
      mount(target, title) {
        if (disposed) throw new Error("SHELL_VIEW_DISPOSED");
        if (!mounted) {
          mounted = true;
          element.addEventListener("click", click);
        }
        savedPreview.resume();
        find("[data-title]").textContent = title;
        target.replaceChildren(element);
      },
      park() {
        if (disposed) return;
        mounted = false;
        element.removeEventListener("click", click);
        savedPreview.park();
        preview.select();
        find("[data-stage]").replaceChildren();
        element.remove();
      },
      dispose() {
        if (disposed) return;
        mounted = false;
        disposed = true;
        element.removeEventListener("click", click);
        preview.dispose();
        unsubscribeSaved();
        savedPreview.dispose();
        navigation.clear();
        state = { active: false, applicationKey: "", tabs: [] };
        find("[data-stage]").replaceChildren();
        element.remove();
      }
    };
  }

  // tests/card-request-integration/harness.ts
  var active = true;
  var start = 0;
  var controller;
  var view;
  var coordinator;
  var bundles = /* @__PURE__ */ new Map();
  var workspace;
  var artifacts = [];
  var saves = [];
  var authCalls = [];
  var root;
  var readyGate;
  var releaseReady = () => {
  };
  var saveGate;
  var releaseSave = () => {
  };
  var unsubSession = () => {
  };
  var staleCallback;
  var liveCallback;
  var staleValue;
  var currentTab = () => coordinator.focused ? coordinator.tabs.get(coordinator.focused) : void 0;
  var input = () => view.element.querySelector("[data-stage] [data-source]");
  var track = /* @__PURE__ */ new Set();
  function task(p) {
    track.add(p);
    void p.catch((e) => unexpected.push(String(e))).finally(() => track.delete(p));
  }
  function render() {
    view.render({ active, applicationKey: "routing-key", session: editorSessionSnapshot(), focused: coordinator.focused, tabs: [...coordinator.tabs.values()].map((tab) => ({ key: tab.key, artifact: tab.artifact, suspended: tab.suspended, element: tab.editor.element, state: tab.editor.state(), savedCardTarget: tab.editor.savedCardTarget })) });
  }
  window.integrationHarness = {
    async mount(enabled = false) {
      configureAutosave({ enabled, delayMs: 2e3 });
      start = Date.now();
      root = document.createElement("main");
      document.body.append(root);
      const first = await fixture(), second = await fixture(source.replaceAll('saved"', 'saved_two"'));
      second.bundle.metadata.artifactId = "art_second_page";
      second.bundle.files.metadata = JSON.stringify(second.bundle.metadata);
      second.baseline = structuredClone(second.bundle.files);
      second.bundle.hash = await digest(JSON.stringify(second.bundle.files));
      second.bundle.locator = "memory/second.visual.json";
      bundles = /* @__PURE__ */ new Map([[first.bundle.locator, first.bundle], [second.bundle.locator, second.bundle]]);
      workspace = { pages: [...bundles.values()], components: [], shells: [], packages: first.packages };
      artifacts = [...bundles.values()].map((bundle, i) => ({ identity: { ...structuredClone(context.page), id: bundle.metadata.artifactId }, applicationId: context.applicationId, applicationKey: "routing-key", locator: bundle.locator, name: i ? "Second" : "Original", group: "Pages", kind: "page", editable: true, visual: workspace }));
      controller = new SavedPreviewRequestController(() => {
        const gate = readyGate;
        readyGate = void 0;
        return gate ?? Promise.resolve();
      });
      view = createBuilderShellView({ navigate: (target, key) => task(coordinator.open(key ?? "routing-key", target)), close: (key) => task(coordinator.close(key)) }, controller);
      coordinator = new BuilderWorkspaceCoordinator(async (key, target) => {
        authCalls.push({ key, target });
        const value = artifacts.find((a) => workspaceIdentityKey(a.identity) === workspaceIdentityKey(target.identity));
        if (!value) throw Error("MEMORY_TARGET_UNRESOLVED");
        return structuredClone({ ...value, visual: workspace });
      }, (authorized) => mountWorkspaceEditor(authorized, () => render(), () => {
        unexpected.push("Edit Definition");
        throw Error("UNADMITTED_DEFINITION");
      }, () => {
        unexpected.push("editor close callback");
      }), () => editorSessionSnapshot().principal.subjectId);
      coordinator.subscribe(render);
      unsubSession = subscribeEditorSession(() => {
        controller.suspend("Session changed.");
        coordinator.suspend();
      });
      globalThis.fetch = (async (url, init) => {
        const parsed = new URL(String(url), location.origin), locator = parsed.searchParams.get("locator");
        if (init?.method !== "PUT" || !locator || !bundles.has(locator) || !parsed.pathname.endsWith("/visual-pages")) {
          unexpected.push("fetch " + String(url));
          throw Error("UNADMITTED_MEMORY_FETCH");
        }
        const body = JSON.parse(String(init.body)), original = bundles.get(locator);
        if (body.expectedHash !== original.hash) throw Error("MEMORY_HASH_CONFLICT");
        saves.push({ url: String(url), body: structuredClone(body), time: Date.now() - start });
        if (saveGate) await saveGate;
        const next = { ...original, files: structuredClone(body.files), metadata: JSON.parse(body.files.metadata), hash: await digest(JSON.stringify(body.files)) };
        bundles.set(locator, next);
        workspace.pages = [...bundles.values()];
        return { ok: true, json: async () => structuredClone(next) };
      });
      view.mount(root, "Actual production request path \xB7 memory only");
      view.artifacts(artifacts);
      await coordinator.open("routing-key", { identity: artifacts[0].identity });
      render();
    },
    select(node = "saved") {
      const select = view.element.querySelector("[data-stage] [data-nodes]");
      select.value = node;
      select.dispatchEvent(new Event("change"));
    },
    saved() {
      return controller.snapshot;
    },
    owner() {
      return currentTab()?.editor.savedCardTarget?.snapshot;
    },
    check() {
      view.element.querySelector('[data-view-action="saved-check"]').click();
    },
    holdReady() {
      readyGate = new Promise((resolve) => {
        releaseReady = resolve;
      });
    },
    releaseReady() {
      releaseReady();
    },
    holdSave() {
      saveGate = new Promise((resolve) => {
        releaseSave = () => {
          saveGate = void 0;
          resolve();
        };
      });
    },
    releaseSave() {
      releaseSave();
    },
    async navigate(second = false) {
      await coordinator.open("routing-key", { identity: artifacts[second ? 1 : 0].identity });
    },
    navigateViaView(second = false) {
      const buttons = [...view.element.querySelectorAll("nav button")];
      buttons.find((b) => b.textContent === (second ? "Second" : "Original")).click();
    },
    sessionChange(subject = false) {
      changeSession(subject);
    },
    park() {
      coordinator.park();
      active = false;
      view.park();
    },
    async remount() {
      active = true;
      view.mount(root, "Memory remount");
      await coordinator.open("routing-key", { identity: artifacts[0].identity });
    },
    async external() {
      const locator = artifacts[0].locator, old = bundles.get(locator), files = { ...old.files, source: old.files.source.replace("uip-layout-item", "uip-layout-item external") };
      const next = { ...old, files, hash: await digest(JSON.stringify(files)) };
      bundles.set(locator, next);
      workspace.pages = [...bundles.values()];
      permitWorkspace({ ...artifacts[0], visual: workspace });
      document.dispatchEvent(new Event("ui-platform-workspace-change"));
    },
    async ownerChange() {
      artifacts[0] = { ...artifacts[0], identity: { ...artifacts[0].identity, owner: { ...artifacts[0].identity.owner, revision: "owner-2" } } };
      await coordinator.open("routing-key", { identity: artifacts[0].identity });
    },
    removeReader() {
      const tab = currentTab();
      const original = tab.editor;
      Object.defineProperty(tab.editor, "savedCardTarget", { value: void 0, configurable: true });
      render();
      return original;
    },
    leakyReader() {
      const tab = currentTab(), original = tab.editor.savedCardTarget;
      staleValue = original.snapshot;
      const reader = { get snapshot() {
        return original.snapshot;
      }, subscribe(fn) {
        liveCallback = fn;
        const stop = original.subscribe(fn);
        return () => {
          staleCallback = fn;
          stop();
        };
      } };
      Object.defineProperty(tab.editor, "savedCardTarget", { value: reader, configurable: true });
      render();
    },
    fireStale() {
      staleCallback?.(staleValue);
    },
    fireLiveStale() {
      liveCallback?.(staleValue);
    },
    delayedReader() {
      const tab = currentTab(), original = tab.editor.savedCardTarget;
      staleValue = original.snapshot;
      const reader = { get snapshot() {
        return original.snapshot;
      }, subscribe(fn) {
        liveCallback = fn;
        let first = true;
        return original.subscribe((value) => {
          if (first) {
            first = false;
            fn(value);
          }
        });
      } };
      Object.defineProperty(tab.editor, "savedCardTarget", { value: reader, configurable: true });
      render();
    },
    unreadableReader() {
      const tab = currentTab(), original = tab.editor.savedCardTarget;
      const reader = { get snapshot() {
        throw Error("Authored uncertain getter");
      }, subscribe: original.subscribe };
      Object.defineProperty(tab.editor, "savedCardTarget", { value: reader, configurable: true });
      render();
    },
    async close() {
      const key = coordinator.focused;
      await coordinator.close(key, true);
    },
    async dispose() {
      view.dispose();
      unsubSession();
      await coordinator.dispose();
      root.remove();
    },
    metrics() {
      return { unexpected: [...unexpected], saves: structuredClone(saves), authCalls: structuredClone(authCalls), sessionCalls: [...sessionCalls], boundaryCalls: structuredClone(boundaryCalls), sessionObservers: sessionObserverCount(), pendingTasks: track.size };
    },
    async snapshot() {
      const field = input();
      const tab = currentTab();
      return { source: field?.value, checksum: await digest(field?.value ?? ""), file: tab?.editor.element.querySelector("[data-file]")?.value, range: field ? [field.selectionStart, field.selectionEnd] : null, state: tab?.editor.state(), undo: !tab?.editor.element.querySelector("[data-undo]")?.disabled, redo: !tab?.editor.element.querySelector("[data-redo]")?.disabled, saves: structuredClone(saves), fixture: view.element.querySelector('[aria-label="Fixture Preview"]')?.textContent, fixtureKind: view.element.querySelector("[data-fixture]")?.value, fixtureSample: view.element.querySelector("[data-sample]")?.value };
    }
  };
})();
