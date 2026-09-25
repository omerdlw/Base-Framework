import { Button, Icon } from "@/core/primitives";
import { SETTINGS } from "./index";

export interface AccountSettingsOverviewViewProps {
  onSelectAction?: (key: string) => void;
  onSelect?: (key: string) => void;
}

export function AccountSettingsOverviewView({
  onSelectAction,
  onSelect,
}: AccountSettingsOverviewViewProps) {
  const handleSelect = onSelectAction ?? onSelect;

  return (
    <div className="grid gap-2">
      {SETTINGS.map((s) => (
        <Button
          key={s.key}
          type="button"
          onClick={() => handleSelect?.(s.key)}
          className="group/item flex min-h-[52px] w-full cursor-pointer items-center gap-3.5 rounded-[20px] bg-white/5 px-3.5 py-2 text-left transition-colors duration-200 hover:bg-white/10 focus-visible:bg-white/10"
        >
          <Icon
            icon={s.icon}
            size={20}
            className="shrink-0 text-white/70 transition-colors duration-200 group-hover/item:text-white"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-white leading-snug">
              {s.title}
            </span>
            <span className="block truncate text-xs text-white/50 transition-colors duration-200 group-hover/item:text-white/70 leading-snug">
              {s.description}
            </span>
          </span>
          <Icon
            icon="solar:alt-arrow-right-linear"
            size={16}
            className="shrink-0 text-white/50 transition-colors duration-200 group-hover/item:text-white"
          />
        </Button>
      ))}
    </div>
  );
}

export const AccountSettingsMenu = ({ state }: { state: any }) => {
  return (
    <AccountSettingsOverviewView
      onSelectAction={(key) =>
        state.openSurfaceByKey?.(key) ?? state.openByKey?.(key)
      }
    />
  );
};

export const AccountEditMenu = AccountSettingsMenu;
