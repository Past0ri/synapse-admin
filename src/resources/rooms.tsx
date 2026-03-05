import EventIcon from "@mui/icons-material/Event";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FastForwardIcon from "@mui/icons-material/FastForward";
import UserIcon from "@mui/icons-material/Group";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PageviewIcon from "@mui/icons-material/Pageview";
import ViewListIcon from "@mui/icons-material/ViewList";
import RoomIcon from "@mui/icons-material/ViewList";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListMui from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import * as React from "react";
import {
  BooleanField,
  DateField,
  Datagrid,
  DeleteButton,
  Identifier,
  List,
  ListProps,
  NumberField,
  RaRecord,
  ReferenceField,
  ReferenceManyField,
  ResourceProps,
  SelectField,
  Show,
  ShowProps,
  Tab,
  TabbedShowLayout,
  TextField,
  TopToolbar,
  useDataProvider,
  useRedirect,
  useRecordContext,
  useTranslate,
} from "react-admin";

import {
  RoomDirectoryPublishButton,
  RoomDirectoryUnpublishButton,
} from "./room_directory";
import { DATE_FORMAT } from "../components/date";

interface RoomLike extends RaRecord {
  id: string;
  room_id?: string;
  name?: string;
  topic?: string;
  canonical_alias?: string;
  creator?: string;
  room_type?: string;
  joined_members?: number;
  joined_local_members?: number;
  joined_local_devices?: number;
  state_events?: number;
  version?: string;
  encryption?: string;
  is_encrypted?: boolean;
  federatable?: boolean;
  public?: boolean;
  join_rules?: string;
  guest_access?: string;
  history_visibility?: string;
}

interface RoomStateEvent extends RaRecord {
  id: string;
  type: string;
  state_key?: string;
  origin_server_ts?: number;
  content?: unknown;
  sender?: string;
}

interface DataProviderLike {
  getList: (
    resource: string,
    params: {
      pagination: { page: number; perPage: number };
      sort: { field: string; order: "ASC" | "DESC" };
      filter: Record<string, unknown>;
    }
  ) => Promise<{ data: unknown; total?: number }>;
  getOne: (resource: string, params: { id: Identifier }) => Promise<{ data: unknown }>;
  getManyReference: (resource: string, params: unknown) => Promise<{ data: unknown }>;
}

const RoomTitle = () => {
  const record = useRecordContext<RoomLike>();
  const translate = useTranslate();
  const name = record ? (record.name && record.name !== "" ? record.name : record.id) : "";
  return (
    <span>
      {translate("resources.rooms.name", 1)} {name}
    </span>
  );
};

const RoomShowActions = () => {
  const record = useRecordContext<RoomLike>();
  const publishButton = record?.public ? <RoomDirectoryUnpublishButton /> : <RoomDirectoryPublishButton />;
  return (
    <TopToolbar>
      {publishButton}
      <DeleteButton
        mutationMode="pessimistic"
        confirmTitle="resources.rooms.action.erase.title"
        confirmContent="resources.rooms.action.erase.content"
      />
    </TopToolbar>
  );
};

export const RoomShow = (props: ShowProps) => {
  const translate = useTranslate();
  return (
    <Show {...props} actions={<RoomShowActions />} title={<RoomTitle />}>
      <TabbedShowLayout>
        <Tab label="synapseadmin.rooms.tabs.basic" icon={<ViewListIcon />}>
          <TextField source="room_id" />
          <TextField source="name" />
          <TextField source="topic" />
          <TextField source="canonical_alias" />
          <ReferenceField source="creator" reference="users">
            <TextField source="id" />
          </ReferenceField>
        </Tab>

        <Tab label="synapseadmin.rooms.tabs.detail" icon={<PageviewIcon />} path="detail">
          <TextField source="joined_members" />
          <TextField source="joined_local_members" />
          <TextField source="joined_local_devices" />
          <TextField source="state_events" />
          <TextField source="version" />
          <TextField source="encryption" emptyText={translate("resources.rooms.enums.unencrypted")} />
        </Tab>

        <Tab label="synapseadmin.rooms.tabs.members" icon={<UserIcon />} path="members">
          <ReferenceManyField reference="room_members" target="room_id" label={false}>
            <Datagrid
              style={{ width: "100%" }}
              rowClick={(id) => `/users/${encodeURIComponent(String(id))}`}
              bulkActionButtons={false}
            >
              <TextField source="id" sortable={false} label="resources.users.fields.id" />
              <ReferenceField
                label="resources.users.fields.displayname"
                source="id"
                reference="users"
                sortable={false}
                link=""
              >
                <TextField source="displayname" sortable={false} />
              </ReferenceField>
            </Datagrid>
          </ReferenceManyField>
        </Tab>

        <Tab label="synapseadmin.rooms.tabs.permission" icon={<VisibilityIcon />} path="permission">
          <BooleanField source="federatable" />
          <BooleanField source="public" />

          <SelectField
            source="join_rules"
            choices={[
              { id: "public", name: "resources.rooms.enums.join_rules.public" },
              { id: "knock", name: "resources.rooms.enums.join_rules.knock" },
              { id: "invite", name: "resources.rooms.enums.join_rules.invite" },
              { id: "private", name: "resources.rooms.enums.join_rules.private" },
            ]}
          />

          <SelectField
            source="guest_access"
            choices={[
              { id: "can_join", name: "resources.rooms.enums.guest_access.can_join" },
              { id: "forbidden", name: "resources.rooms.enums.guest_access.forbidden" },
            ]}
          />

          <SelectField
            source="history_visibility"
            choices={[
              { id: "invited", name: "resources.rooms.enums.history_visibility.invited" },
              { id: "joined", name: "resources.rooms.enums.history_visibility.joined" },
              { id: "shared", name: "resources.rooms.enums.history_visibility.shared" },
              { id: "world_readable", name: "resources.rooms.enums.history_visibility.world_readable" },
            ]}
          />
        </Tab>

        <Tab label={translate("resources.room_state.name", { smart_count: 2 })} icon={<EventIcon />} path="state">
          <ReferenceManyField reference="room_state" target="room_id" label={false}>
            <Datagrid style={{ width: "100%" }} bulkActionButtons={false}>
              <TextField source="type" sortable={false} />
              <DateField source="origin_server_ts" showTime options={DATE_FORMAT} sortable={false} />
              <TextField source="content" sortable={false} />
              <ReferenceField source="sender" reference="users" sortable={false}>
                <TextField source="id" />
              </ReferenceField>
            </Datagrid>
          </ReferenceManyField>
        </Tab>

        <Tab label="resources.forward_extremities.name" icon={<FastForwardIcon />} path="forward_extremities">
          <Box sx={{ fontFamily: "Roboto, Helvetica, Arial, sans-serif", margin: "0.5em" }}>
            {translate("resources.rooms.helper.forward_extremities")}
          </Box>

          <ReferenceManyField reference="forward_extremities" target="room_id" label={false}>
            <Datagrid style={{ width: "100%" }} bulkActionButtons={false}>
              <TextField source="id" sortable={false} />
              <DateField source="received_ts" showTime options={DATE_FORMAT} sortable={false} />
              <NumberField source="depth" sortable={false} />
              <TextField source="state_group" sortable={false} />
            </Datagrid>
          </ReferenceManyField>
        </Tab>
      </TabbedShowLayout>
    </Show>
  );
};

function roomLabel(r: RoomLike): string {
  return r.name || r.canonical_alias || r.id;
}

async function fetchSpaceChildrenRoomIds(dataProvider: DataProviderLike, spaceRoomId: string): Promise<string[]> {
  const res = await dataProvider.getManyReference("room_state", {
    id: spaceRoomId,
    target: "room_id",
    pagination: { page: 1, perPage: 2000 },
    sort: { field: "origin_server_ts", order: "ASC" },
    filter: {},
  });

  const events = (res?.data ?? []) as RoomStateEvent[];
  return events
    .filter((e) => e.type === "m.space.child")
    .map((e) => e.state_key)
    .filter((x): x is string => typeof x === "string" && x.length > 0);
}

interface SpacesPanelModel {
  spaces: RoomLike[];
  roomById: Record<string, RoomLike>;
  childrenBySpaceId: Record<string, string[]>;
}

async function isSpaceByState(dataProvider: DataProviderLike, roomId: string): Promise<boolean> {
  const res = await dataProvider.getManyReference("room_state", {
    id: roomId,
    target: "room_id",
    pagination: { page: 1, perPage: 2000 },
    sort: { field: "origin_server_ts", order: "ASC" },
    filter: {},
  });

  const events = (res?.data ?? []) as RoomStateEvent[];

  // Detect via m.room.create { type: "m.space" }
  const create = events.find((e) => e.type === "m.room.create");
  if (create && typeof create.content === "object" && create.content !== null) {
    const c = create.content as { type?: unknown };
    if (c.type === "m.space") return true;
  }

  // Or: any m.space.child is a good signal it’s a space
  return events.some((e) => e.type === "m.space.child");
}

function domainOfRoom(r: RoomLike): string {
  const src = r.canonical_alias && r.canonical_alias.includes(":") ? r.canonical_alias : r.id;
  const idx = src.lastIndexOf(":");
  return idx >= 0 ? src.slice(idx + 1) : "unknown";
}

const SpacesPanel = () => {
  const dataProvider = useDataProvider() as unknown as DataProviderLike;
  const redirect = useRedirect();

  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [model, setModel] = React.useState<SpacesPanelModel | null>(null);

  // Domain collapse state
  const [expandedDomain, setExpandedDomain] = React.useState<Record<string, boolean>>({});

  const toggleDomain = (domain: string) => {
    setExpandedDomain((prev) => ({ ...prev, [domain]: !prev[domain] }));
  };

  const expandAllDomains = () => {
    if (!model) return;
    const next: Record<string, boolean> = {};
    for (const s of model.spaces) next[domainOfRoom(s)] = true;
    setExpandedDomain(next);
  };

  const collapseAllDomains = () => {
    if (!model) return;
    const next: Record<string, boolean> = {};
    for (const s of model.spaces) next[domainOfRoom(s)] = false;
    setExpandedDomain(next);
  };

  // Space collapse state
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  const toggle = (spaceId: string) => {
    setExpanded((prev) => ({ ...prev, [spaceId]: !prev[spaceId] }));
  };

  const expandAll = () => {
    if (!model) return;
    const next: Record<string, boolean> = {};
    for (const s of model.spaces) next[s.id] = true;
    setExpanded(next);
  };

  const collapseAll = () => {
    if (!model) return;
    const next: Record<string, boolean> = {};
    for (const s of model.spaces) next[s.id] = false;
    setExpanded(next);
  };

  // Guard against accidental repeated starts (dev strict mode / re-mounts)
  const loadKeyRef = React.useRef<number>(0);

  React.useEffect(() => {
    const myKey = loadKeyRef.current + 1;
    loadKeyRef.current = myKey;

    let alive = true;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const roomsRes = await dataProvider.getList("rooms", {
          pagination: { page: 1, perPage: 1000 },
          sort: { field: "name", order: "ASC" },
          filter: {},
        });

        if (!alive || loadKeyRef.current !== myKey) return;

        const rooms = (roomsRes.data as RoomLike[]) ?? [];
        const roomById: Record<string, RoomLike> = {};
        for (const r of rooms) roomById[r.id] = r;

        // 1) Fast detection (if Synapse returns room_type)
        let spaces = rooms.filter((r) => r.room_type === "m.space");

        // 2) Fallback detection if room_type is missing/empty (only if fast yields none)
        if (spaces.length === 0) {
          const detected: RoomLike[] = [];
          const MAX_CHECK = Math.min(rooms.length, 300);

          for (let i = 0; i < MAX_CHECK; i += 1) {
            const r = rooms[i];
            try {
              // eslint-disable-next-line no-await-in-loop
              const ok = await isSpaceByState(dataProvider, r.id);
              if (ok) detected.push(r);
            } catch {
              // ignore
            }
            if (!alive || loadKeyRef.current !== myKey) return;
          }

          spaces = detected;
        }

        // Fetch children for each detected space
        const childrenBySpaceId: Record<string, string[]> = {};
        for (const s of spaces) {
          try {
            // eslint-disable-next-line no-await-in-loop
            const childIds = await fetchSpaceChildrenRoomIds(dataProvider, s.id);
            childrenBySpaceId[s.id] = childIds;
          } catch {
            childrenBySpaceId[s.id] = [];
          }
          if (!alive || loadKeyRef.current !== myKey) return;
        }

        const newModel: SpacesPanelModel = { spaces, roomById, childrenBySpaceId };
        setModel(newModel);

        // domains open by default
        const nextDomain: Record<string, boolean> = {};
        for (const s of spaces) nextDomain[domainOfRoom(s)] = true;
        setExpandedDomain(nextDomain);

        // spaces collapsed by default
        const nextExpanded: Record<string, boolean> = {};
        for (const s of spaces) nextExpanded[s.id] = false;
        setExpanded(nextExpanded);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setModel(null);
      } finally {
        if (alive && loadKeyRef.current === myKey) setLoading(false);
      }
    };

    run();

    return () => {
      alive = false;
    };
  }, [dataProvider]);

  return (
    <Paper variant="outlined" sx={{ mb: 2 }}>
      <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography variant="h6">Spaces</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Click a domain or space to expand/collapse. Use the external icon to open a space.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Button
            size="small"
            variant="outlined"
            onClick={expandAllDomains}
            disabled={!model || model.spaces.length === 0}
          >
            Expand domains
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={collapseAllDomains}
            disabled={!model || model.spaces?.length === 0}
          >
            Collapse domains
          </Button>

          <Button size="small" variant="outlined" onClick={expandAll} disabled={!model || model.spaces.length === 0}>
            Expand spaces
          </Button>
          <Button size="small" variant="outlined" onClick={collapseAll} disabled={!model || model.spaces.length === 0}>
            Collapse spaces
          </Button>
        </Box>
      </Box>

      <Divider />

      <Box sx={{ p: 1 }}>
        {loading ? <Typography sx={{ p: 1 }}>Loading spaces…</Typography> : null}
        {error ? (
          <Typography sx={{ p: 1 }} color="error">
            Failed to load spaces: {error}
          </Typography>
        ) : null}

        {model && model.spaces.length === 0 ? (
          <Typography sx={{ p: 1 }}>
            No spaces found. (If you have more than 300 rooms and room_type isn’t present, increase MAX_CHECK.)
          </Typography>
        ) : null}

        {model ? (
          <ListMui dense disablePadding>
            {(() => {
              const spacesByDomain: Record<string, RoomLike[]> = {};
              for (const s of model.spaces) {
                const d = domainOfRoom(s);
                if (!spacesByDomain[d]) spacesByDomain[d] = [];
                spacesByDomain[d].push(s);
              }

              const domainKeys = Object.keys(spacesByDomain).sort();

              // Optional: sort spaces inside each domain by label
              for (const d of domainKeys) {
                spacesByDomain[d].sort((a, b) => roomLabel(a).localeCompare(roomLabel(b)));
              }

              return domainKeys.map((domain) => {
                const isDomainOpen = expandedDomain[domain] ?? true;
                const domainSpaces = spacesByDomain[domain];

                return (
                  <React.Fragment key={domain}>
                    {/* Domain header */}
                    <ListItemButton onClick={() => toggleDomain(domain)} sx={{ bgcolor: "action.hover" }}>
                      <ListItemText primary={domain} secondary={`${domainSpaces.length} space(s)`} />
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleDomain(domain);
                        }}
                        aria-label={isDomainOpen ? "Collapse domain" : "Expand domain"}
                      >
                        {isDomainOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </ListItemButton>

                    <Collapse in={isDomainOpen} timeout="auto" unmountOnExit>
                      {domainSpaces.map((space) => {
                        const children = model.childrenBySpaceId[space.id] ?? [];
                        const isOpen = !!expanded[space.id];

                        return (
                          <React.Fragment key={space.id}>
                            {/* Space row */}
                            <ListItemButton onClick={() => toggle(space.id)} sx={{ pl: 2, pr: 1 }}>
                              <ListItemIcon sx={{ minWidth: 34 }}>
                                <ViewListIcon />
                              </ListItemIcon>

                              <ListItemText primary={roomLabel(space)} secondary={space.canonical_alias || space.id} />

                              {/* Open space show page */}
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  redirect("show", "rooms", space.id);
                                }}
                                aria-label="Open space"
                              >
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>

                              {/* Expand/collapse icon (row click also toggles) */}
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggle(space.id);
                                }}
                                aria-label={isOpen ? "Collapse" : "Expand"}
                              >
                                {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              </IconButton>
                            </ListItemButton>

                            {/* Children */}
                            <Collapse in={isOpen} timeout="auto" unmountOnExit>
                              {children.length === 0 ? (
                                <Typography variant="body2" sx={{ pl: 10, py: 1, opacity: 0.8 }}>
                                  (No linked rooms)
                                </Typography>
                              ) : (
                                children.map((childId) => {
                                  const child = model.roomById[childId];
                                  const childPrimary = child ? roomLabel(child) : childId;
                                  const childIsSpace = child ? child.room_type === "m.space" : false;

                                  return (
                                    <ListItemButton
                                      key={`${space.id}:${childId}`}
                                      sx={{ pl: 4 }}
                                      onClick={() => redirect("show", "rooms", childId)}
                                    >
                                      <ListItemIcon sx={{ minWidth: 34 }}>
                                        {childIsSpace ? <ViewListIcon /> : <RoomIcon />}
                                      </ListItemIcon>
                                      <ListItemText primary={childPrimary} secondary={child?.canonical_alias || childId} />
                                    </ListItemButton>
                                  );
                                })
                              )}
                            </Collapse>
                          </React.Fragment>
                        );
                      })}
                    </Collapse>
                  </React.Fragment>
                );
              });
            })()}
          </ListMui>
        ) : null}
      </Box>
    </Paper>
  );
};

export const RoomList = (props: ListProps) => (
  <List
    {...props}
    pagination={false}
    sort={{ field: "name", order: "ASC" }}
    // optional: keep search box + actions, or remove both:
    // filters={roomFilters}
    // actions={<RoomListActions />}
    actions={false}
    filters={undefined}
  >
    <SpacesPanel />
  </List>
);

const resource: ResourceProps = {
  name: "rooms",
  icon: RoomIcon,
  list: RoomList,
  show: RoomShow,
};

export default resource;

