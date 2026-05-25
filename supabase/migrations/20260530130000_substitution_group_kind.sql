-- Adiciona tipo "substitution" para acompanhamentos mutuamente exclusivos (ex.: fritas vs bravas)

ALTER TABLE modifier_groups DROP CONSTRAINT IF EXISTS modifier_groups_group_kind_check;

ALTER TABLE modifier_groups
  ADD CONSTRAINT modifier_groups_group_kind_check
  CHECK (group_kind IN ('choice', 'removal', 'extra', 'substitution'));

COMMENT ON COLUMN modifier_groups.group_kind IS
  'choice=escolha obrigatória, removal=remover ingrediente, extra=quantidade +/-, substitution=troca única (ex. patatas)';
