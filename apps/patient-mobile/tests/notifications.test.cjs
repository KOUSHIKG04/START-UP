const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "../../..");
const notification = (id, read = false) => ({
  id,
  template_key: "appointment.requested",
  safe_parameters: { appointment_id: "appointment-1" },
  created_at: new Date().toISOString(),
  is_read: read,
  is_important: false,
  is_emergency: false,
});
function wrapper(
  app,
  data = [notification("unread"), notification("read", true)]
) {
  const queries = [],
    mutations = [],
    invalidations = [],
    calls = [],
    routes = [],
    errors = [];
  let enabled = false;
  const cache = { data };
  const client = {};
  const cacheClient = {
    invalidateQueries: (options) => invalidations.push(options),
    setQueryData: (_, updater) => {
      cache.data = updater(cache.data);
    },
  };
  function load(file) {
    const module = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    vm.runInNewContext(code, {
      module,
      exports: module.exports,
      require(id) {
        if (id === "react/jsx-runtime")
          return { jsx: (type, props) => ({ type, props }) };
        if (id === "react")
          return {
            useState: () => [
              enabled,
              (value) => {
                enabled = value;
              },
            ],
            useCallback: (callback) => callback,
          };
        if (id === "@startup/mobile-ui")
          return {
            NotificationDrawer: "SharedDrawer",
            useToastFeedback: (feedback) => errors.push(feedback.error),
          };
        if (id === "@startup/contracts")
          return { notificationTime: () => "Just now" };
        if (id.endsWith("/services/supabase")) return { supabase: client };
        if (id === "expo-router")
          return { router: { push: (route) => routes.push(route) } };
        if (id.endsWith("appointmentNavigation"))
          return {
            appointmentDetailsRoute: (id) =>
              id ? { pathname: "/appointments/[id]", params: { id } } : null,
          };
        if (id === "@startup/data-access")
          return Object.fromEntries(
            [
              "dismissMyNotification",
              "listMyNotifications",
              "markMyNotificationsRead",
            ].map((name) => [name, (...args) => calls.push({ name, args })])
          );
        if (id === "@tanstack/react-query")
          return {
            useQueryClient: () => cacheClient,
            useQuery: (options) => {
              queries.push(options);
              return { data, isLoading: false, isError: false };
            },
            useMutation: (options) => {
              const mutation = {
                ...options,
                mutate: (...args) => calls.push({ name: "mutate", args }),
              };
              mutations.push(mutation);
              return mutation;
            },
          };
        if (id.startsWith(".")) {
          const target = path.resolve(path.dirname(file), id);
          return load([target + ".ts", target + ".tsx"].find(fs.existsSync));
        }
        throw Error(`Unmocked import ${id}`);
      },
    });
    return module.exports;
  }
  const component = load(
    path.join(
      root,
      `apps/${app}-mobile/src/features/notifications/components/NotificationDrawer.tsx`
    )
  );
  let closed = 0;
  const render = () =>
    component.NotificationDrawer({
      visible: enabled,
      onClose: () => closed++,
    });
  return {
    render,
    queries,
    mutations,
    invalidations,
    cache,
    calls,
    routes,
    errors,
    client,
    closed: () => closed,
  };
}

for (const app of ["patient", "doctor", "driver"]) {
  test(`${app} retains query activation, read actions, dismissal cache and app theme`, () => {
    const h = wrapper(app);
    let view = h.render();
    assert.equal(view.type, "SharedDrawer");
    assert.equal(view.props.theme, app);
    assert.equal(h.queries[0].enabled, false);
    view.props.onVisibilityChange(true);
    view = h.render();
    assert.equal(h.queries.at(-1).enabled, true);
    assert.equal(JSON.stringify(h.queries[0].queryKey), '["my-notifications"]');
    h.queries[0].queryFn();
    assert.equal(h.calls.at(-1).name, "listMyNotifications");
    assert.equal(h.calls.at(-1).args[0], h.client);
    view.props.onNotificationPress("read");
    assert.equal(h.calls.filter((call) => call.name === "mutate").length, 0);
    view.props.onNotificationPress("unread");
    assert.equal(JSON.stringify(h.calls.at(-1).args), '[["unread"]]');
    view.props.onMarkAllRead();
    assert.equal(JSON.stringify(h.calls.at(-1).args), "[]");
    view.props.onDelete("unread");
    assert.equal(JSON.stringify(h.calls.at(-1).args), '["unread"]');
    const [read, remove] = h.mutations;
    read.mutationFn(["unread"]);
    read.onSuccess();
    assert.equal(h.calls.at(-1).name, "markMyNotificationsRead");
    remove.mutationFn("unread");
    remove.onSuccess(undefined, "unread");
    assert.equal(h.calls.at(-1).name, "dismissMyNotification");
    assert.equal(h.cache.data.length, 1);
    assert.equal(h.cache.data[0].id, "read");
    assert.equal(h.invalidations.length, 2);
    assert.equal(
      h.errors.every((error) => !error),
      true
    );
    view.props.onVisibilityChange(false);
    h.render();
    assert.equal(h.queries.at(-1).enabled, false);
  });
}

test("Doctor closes the drawer and opens appointment details, Patient and Driver do not navigate", () => {
  for (const app of ["patient", "doctor", "driver"]) {
    const h = wrapper(app);
    const view = h.render();
    view.props.onNotificationPress("unread");
    assert.equal(h.closed(), app === "doctor" ? 1 : 0);
    assert.equal(h.routes.length, app === "doctor" ? 1 : 0);
    if (app === "doctor") assert.equal(h.routes[0].params.id, "appointment-1");
  }
});

test("Doctor preserves requested and check-in notification copy", () => {
  const requested = wrapper("doctor").render().props.notifications[0];
  assert.equal(requested.title, "Appointment requested");
  assert.match(requested.message, /accept or reject/);
  const checkIn = {
    ...notification("arrived"),
    template_key: "appointment.check_in",
    safe_parameters: { booking_code: "ABC" },
  };
  assert.equal(
    wrapper("doctor", [checkIn]).render().props.notifications[0].title,
    "Patient arrived at clinic"
  );
  assert.equal(
    wrapper("patient", [checkIn]).render().props.notifications[0].title,
    "Clinic check-in confirmed"
  );
});
