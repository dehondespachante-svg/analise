/**
 * mui-compat.tsx
 * Drop-in replacement for @material-ui/core components used in src/nota/*.
 * Implemented with native HTML + inline styles so MUI v4 can be fully removed.
 */
import React from 'react';

// ─── makeStyles ──────────────────────────────────────────────────────────────
// We inject one global <style> tag per call and return the key names as class names.
let _styleEl: HTMLStyleElement | null = null;
function getStyleEl(): HTMLStyleElement {
  if (typeof document === 'undefined') return null as any;
  if (_styleEl) return _styleEl;
  _styleEl = document.createElement('style');
  _styleEl.setAttribute('data-mui-compat', '1');
  document.head.appendChild(_styleEl);
  return _styleEl;
}

function styleObjToCss(selector: string, obj: Record<string, any>): string {
  let css = `${selector}{`;
  let nested = '';
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'object' && v !== null && !k.startsWith('@')) {
      // pseudo-class like '& p', '&:hover', etc.
      const subSelector = k.startsWith('&') ? selector.replace('&', k.replace(/^&\s*/, '')) : k;
      nested += styleObjToCss(subSelector, v as any);
    } else if (k.startsWith('@media')) {
      nested += `${k}{${styleObjToCss(selector, v as any)}}`;
    } else if (typeof v === 'string' || typeof v === 'number') {
      // camelCase to kebab-case
      const prop = k.replace(/([A-Z])/g, m => '-' + m.toLowerCase());
      css += `${prop}:${v};`;
    }
  }
  css += '}';
  return css + nested;
}

let _injectedKeys = new Set<string>();

type MuiThemeLike = { spacing: (n: number) => number; breakpoints: { down: (bp: string) => string } };
type StylesFactory = (theme: MuiThemeLike) => Record<string, Record<string, any>>;

export function makeStyles(stylesOrFactory: StylesFactory | Record<string, Record<string, any>>) {
  return function useStyles() {
    const fakeTheme: MuiThemeLike = { spacing: (n) => n * 8, breakpoints: { down: () => '' } };
    const styles = typeof stylesOrFactory === 'function' ? stylesOrFactory(fakeTheme) : stylesOrFactory;
    const keys = Object.keys(styles);

    // Inject CSS once on the client
    if (typeof document !== 'undefined') {
      const el = getStyleEl();
      if (el) {
        keys.forEach(key => {
          const cssKey = `mc-${key}`;
          if (!_injectedKeys.has(cssKey)) {
            _injectedKeys.add(cssKey);
            el.textContent += styleObjToCss(`.${cssKey}`, styles[key]);
          }
        });
      }
    }

    // Return object mapping key → className string
    return Object.fromEntries(keys.map(k => [k, `mc-${k}`]));
  };
}

// ─── Typography ──────────────────────────────────────────────────────────────
const typographyStyles: Record<string, React.CSSProperties> = {
  h4: { fontSize: '2.125rem', fontWeight: 400, lineHeight: 1.235, letterSpacing: '0.00735em' },
  h5: { fontSize: '1.5rem', fontWeight: 400, lineHeight: 1.334, letterSpacing: '0em' },
  h6: { fontSize: '1.25rem', fontWeight: 500, lineHeight: 1.6, letterSpacing: '0.0075em' },
  subtitle1: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.75, letterSpacing: '0.00938em' },
  subtitle2: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.57, letterSpacing: '0.00714em' },
  body1: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.5, letterSpacing: '0.00938em' },
  body2: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.43, letterSpacing: '0.01071em' },
  caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.66, letterSpacing: '0.03333em' },
};
const variantTag: Record<string, string> = {
  h4: 'h4', h5: 'h5', h6: 'h6',
  subtitle1: 'h6', subtitle2: 'h6',
  body1: 'p', body2: 'p', caption: 'span',
};

interface TypographyProps {
  variant?: keyof typeof typographyStyles;
  component?: string;
  style?: React.CSSProperties;
  className?: string;
  gutterBottom?: boolean;
  paragraph?: boolean;
  color?: string;
  children?: React.ReactNode;
  [key: string]: any;
}
export function Typography({ variant = 'body1', component, style, className, gutterBottom, paragraph, color, children, ...rest }: TypographyProps) {
  const tag = component || (paragraph ? 'p' : variantTag[variant] || 'p');
  const variantStyle = typographyStyles[variant] || {};
  const colorStyle: React.CSSProperties = color === 'textSecondary' ? { color: '#666' } : color === 'primary' ? { color: '#1976d2' } : color === 'secondary' ? { color: '#9c27b0' } : {};
  const combined: React.CSSProperties = {
    margin: 0,
    ...variantStyle,
    ...(gutterBottom ? { marginBottom: '0.35em' } : {}),
    ...(paragraph ? { marginBottom: 16 } : {}),
    ...colorStyle,
    ...style,
  };
  return React.createElement(tag, { style: combined, className, ...rest }, children);
}

// ─── Paper ───────────────────────────────────────────────────────────────────
interface PaperProps {
  elevation?: number;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler;
  [key: string]: any;
}
export function Paper({ elevation = 1, style, className, children, onClick, ...rest }: PaperProps) {
  const shadow = elevation === 0 ? 'none'
    : elevation <= 1 ? '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'
    : elevation <= 3 ? '0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)'
    : '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)';
  return (
    <div
      style={{ background: '#fff', borderRadius: 4, boxShadow: shadow, ...style }}
      className={className}
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps {
  variant?: 'contained' | 'outlined' | 'text';
  color?: string;
  size?: 'small' | 'medium' | 'large';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: React.MouseEventHandler;
  style?: React.CSSProperties;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  children?: React.ReactNode;
  [key: string]: any;
}
export function Button({ variant = 'text', color, size = 'medium', startIcon, endIcon, disabled, fullWidth, onClick, style, className, type = 'button', children, ...rest }: ButtonProps) {
  const isContained = variant === 'contained';
  const isOutlined = variant === 'outlined';
  const isError = color === 'error';
  const isSecondary = color === 'secondary';

  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    border: 'none',
    borderRadius: 4,
    fontFamily: 'inherit',
    fontWeight: 500,
    fontSize: size === 'small' ? '0.8125rem' : size === 'large' ? '0.9375rem' : '0.875rem',
    letterSpacing: '0.02857em',
    textTransform: 'uppercase',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    padding: size === 'small' ? '4px 10px' : size === 'large' ? '8px 22px' : '6px 16px',
    width: fullWidth ? '100%' : undefined,
    transition: 'background 0.2s, box-shadow 0.2s',
    userSelect: 'none',
  };

  const primaryColor = isError ? '#d32f2f' : isSecondary ? '#9c27b0' : '#1976d2';

  if (isContained) {
    Object.assign(base, {
      background: primaryColor,
      color: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    });
  } else if (isOutlined) {
    Object.assign(base, {
      background: 'transparent',
      color: primaryColor,
      border: `1px solid ${primaryColor}`,
    });
  } else {
    Object.assign(base, {
      background: 'transparent',
      color: primaryColor,
    });
  }

  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, ...style }} className={className} {...rest}>
      {startIcon && <span style={{ display: 'inline-flex', fontSize: 'inherit' }}>{startIcon}</span>}
      {children}
      {endIcon && <span style={{ display: 'inline-flex', fontSize: 'inherit' }}>{endIcon}</span>}
    </button>
  );
}

// ─── TextField ────────────────────────────────────────────────────────────────
interface TextFieldProps {
  label?: string;
  value?: any;
  onChange?: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  variant?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  multiline?: boolean;
  rows?: number;
  type?: string;
  placeholder?: string;
  inputProps?: any;
  InputProps?: any;
  style?: React.CSSProperties;
  disabled?: boolean;
  autoFocus?: boolean;
  onKeyDown?: React.KeyboardEventHandler;
  onKeyPress?: React.KeyboardEventHandler;
  onBlur?: React.FocusEventHandler;
  select?: boolean;
  children?: React.ReactNode;
  className?: string;
  stickyHeader?: boolean;
  [key: string]: any;
}
export function TextField({ label, value, onChange, variant, size, fullWidth, multiline, rows, type, placeholder, inputProps, InputProps, style, disabled, autoFocus, onKeyDown, onKeyPress, onBlur, select, children, className, ...rest }: TextFieldProps) {
  const wrapStyle: React.CSSProperties = { display: 'inline-flex', flexDirection: 'column', width: fullWidth ? '100%' : undefined, ...style };
  const inputStyle: React.CSSProperties = {
    border: '1px solid #c4c4c4',
    borderRadius: 4,
    padding: size === 'small' ? '6px 8px' : '10px 12px',
    fontSize: '1rem',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    background: disabled ? '#f5f5f5' : '#fff',
  };
  const labelStyle: React.CSSProperties = { fontSize: '0.75rem', color: '#666', marginBottom: 2 };

  if (select) {
    return (
      <div style={wrapStyle} className={className}>
        {label && <label style={labelStyle}>{label}</label>}
        <select
          value={value}
          onChange={onChange as any}
          disabled={disabled}
          style={{ ...inputStyle, appearance: 'auto' } as any}
        >
          {children}
        </select>
      </div>
    );
  }

  if (multiline) {
    return (
      <div style={wrapStyle} className={className}>
        {label && <label style={labelStyle}>{label}</label>}
        <textarea
          value={value}
          onChange={onChange as any}
          rows={rows || 4}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          onKeyDown={onKeyDown as any}
          onBlur={onBlur as any}
          style={{ ...inputStyle, resize: 'vertical' }}
          {...(inputProps || {})}
        />
      </div>
    );
  }

  const startAdornment = InputProps?.startAdornment;
  const endAdornment = InputProps?.endAdornment;

  return (
    <div style={wrapStyle} className={className}>
      {label && <label style={labelStyle}>{label}</label>}
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        {startAdornment && <span style={{ position: 'absolute', left: 8 }}>{startAdornment}</span>}
        <input
          type={type || 'text'}
          value={value}
          onChange={onChange as any}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          onKeyDown={onKeyDown as any}
          onKeyPress={onKeyPress as any}
          onBlur={onBlur as any}
          style={{ ...inputStyle, paddingLeft: startAdornment ? 32 : undefined }}
          {...(inputProps || {})}
        />
        {endAdornment && <span style={{ position: 'absolute', right: 8 }}>{endAdornment}</span>}
      </div>
    </div>
  );
}

// ─── IconButton ───────────────────────────────────────────────────────────────
interface IconButtonProps {
  size?: 'small' | 'medium' | 'large';
  onClick?: React.MouseEventHandler;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  title?: string;
  children?: React.ReactNode;
  [key: string]: any;
}
export function IconButton({ size = 'medium', onClick, disabled, style, className, title, children, ...rest }: IconButtonProps) {
  const dim = size === 'small' ? 32 : size === 'large' ? 48 : 40;
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dim,
        height: dim,
        border: 'none',
        borderRadius: '50%',
        background: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        padding: 0,
        ...style,
      }}
      className={className}
      {...rest}
    >
      {children}
    </button>
  );
}

// ─── CircularProgress ─────────────────────────────────────────────────────────
interface CircularProgressProps {
  size?: number;
  style?: React.CSSProperties;
  color?: string;
  thickness?: number;
}
export function CircularProgress({ size = 40, style, color }: CircularProgressProps) {
  const strokeColor = color === 'inherit' ? 'currentColor' : '#1976d2';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      style={{ animation: 'mui-spin 1.4s linear infinite', ...style }}
    >
      <style>{`@keyframes mui-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
      <circle
        cx="20" cy="20" r="16"
        fill="none"
        stroke={strokeColor}
        strokeWidth="4"
        strokeDasharray="80 20"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
interface TooltipProps {
  title: React.ReactNode;
  children: React.ReactElement;
  [key: string]: any;
}
export function Tooltip({ title, children }: TooltipProps) {
  return React.cloneElement(children as React.ReactElement<any>, { title: title != null ? String(title) : undefined });
}

// ─── Tabs / Tab ───────────────────────────────────────────────────────────────
interface TabsProps {
  value: number;
  onChange: (e: React.SyntheticEvent, v: number) => void;
  style?: React.CSSProperties;
  className?: string;
  variant?: string;
  children?: React.ReactNode;
}
export function Tabs({ value, onChange, style, className, children }: TabsProps) {
  return (
    <div
      role="tablist"
      style={{ display: 'flex', borderBottom: '2px solid #e0e0e0', ...style }}
      className={className}
    >
      {React.Children.map(children, (child, i) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child as React.ReactElement<any>, {
          _active: (child as any).props.value !== undefined ? (child as any).props.value === value : i === value,
          _index: i,
          _onChange: onChange,
        });
      })}
    </div>
  );
}

interface TabProps {
  label?: React.ReactNode;
  icon?: React.ReactNode;
  value?: any;
  style?: React.CSSProperties;
  disabled?: boolean;
  _active?: boolean;
  _index?: number;
  _onChange?: (e: React.SyntheticEvent, v: number) => void;
}
export function Tab({ label, icon, value, style, disabled, _active, _index, _onChange }: TabProps) {
  return (
    <button
      role="tab"
      type="button"
      aria-selected={_active}
      disabled={disabled}
      onClick={(e) => !disabled && _onChange && _onChange(e, value !== undefined ? value : (_index ?? 0))}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '12px 16px',
        border: 'none',
        background: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        fontSize: '0.875rem',
        fontWeight: _active ? 600 : 400,
        color: _active ? '#1976d2' : '#555',
        borderBottom: _active ? '2px solid #1976d2' : '2px solid transparent',
        marginBottom: -2,
        transition: 'color 0.2s',
        ...style,
      }}
    >
      {icon}{label}
    </button>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
interface DividerProps {
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
}
export function Divider({ style, className, children }: DividerProps) {
  if (children) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...style }} className={className}>
        <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
        {children}
        <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
      </div>
    );
  }
  return <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '8px 0', ...style }} className={className} />;
}

// ─── Chip ─────────────────────────────────────────────────────────────────────
interface ChipProps {
  label?: React.ReactNode;
  size?: 'small' | 'medium';
  onDelete?: () => void;
  color?: string;
  variant?: string;
  style?: React.CSSProperties;
  className?: string;
  icon?: React.ReactNode;
}
export function Chip({ label, size = 'medium', onDelete, color, variant, style, className, icon }: ChipProps) {
  const isOutlined = variant === 'outlined';
  const bg = color === 'primary' ? '#1976d2' : color === 'secondary' ? '#9c27b0' : color === 'error' ? '#d32f2f' : color === 'warning' ? '#ed6c02' : '#e0e0e0';
  const fg = color && color !== 'default' ? '#fff' : '#333';
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: size === 'small' ? '2px 8px' : '4px 12px',
        fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
        borderRadius: 16,
        background: isOutlined ? 'transparent' : bg,
        color: isOutlined ? bg : fg,
        border: isOutlined ? `1px solid ${bg}` : 'none',
        fontFamily: 'inherit',
        ...style,
      }}
    >
      {icon && <span style={{ display: 'inline-flex', marginRight: 2 }}>{icon}</span>}
      {label}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 2, color: 'inherit', fontSize: 12, lineHeight: 1 }}
        >
          ×
        </button>
      )}
    </span>
  );
}

// ─── CardContent ──────────────────────────────────────────────────────────────
interface CardContentProps { style?: React.CSSProperties; className?: string; children?: React.ReactNode; }
export function CardContent({ style, className, children }: CardContentProps) {
  return <div style={{ padding: 16, ...style }} className={className}>{children}</div>;
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps {
  style?: React.CSSProperties;
  className?: string;
  onClick?: React.MouseEventHandler;
  children?: React.ReactNode;
  [key: string]: any;
}
export function Card({ style, className, onClick, children, ...rest }: CardProps) {
  return (
    <div
      style={{ background: '#fff', borderRadius: 4, boxShadow: '0 2px 4px rgba(0,0,0,0.12)', overflow: 'hidden', ...style }}
      className={className}
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────
interface DialogProps {
  open: boolean;
  onClose?: () => void;
  maxWidth?: string;
  fullWidth?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export function Dialog({ open, onClose, maxWidth = 'sm', fullWidth, style, children }: DialogProps) {
  if (!open) return null;
  const widthMap: Record<string, number> = { xs: 444, sm: 600, md: 960, lg: 1280, xl: 1920 };
  const mw = widthMap[maxWidth] || 600;
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div style={{ background: '#fff', borderRadius: 4, maxWidth: fullWidth ? '100%' : mw, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 11px 15px rgba(0,0,0,0.2)', ...style }}>
        {children}
      </div>
    </div>
  );
}

interface DialogTitleProps { style?: React.CSSProperties; children?: React.ReactNode; }
export function DialogTitle({ style, children }: DialogTitleProps) {
  return <div style={{ padding: '16px 24px', fontSize: '1.25rem', fontWeight: 500, ...style }}>{children}</div>;
}

interface DialogContentProps { style?: React.CSSProperties; children?: React.ReactNode; }
export function DialogContent({ style, children }: DialogContentProps) {
  return <div style={{ padding: '8px 24px', ...style }}>{children}</div>;
}

interface DialogActionsProps { style?: React.CSSProperties; children?: React.ReactNode; }
export function DialogActions({ style, children }: DialogActionsProps) {
  return <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, padding: '8px 8px 16px', ...style }}>{children}</div>;
}

// ─── LinearProgress ───────────────────────────────────────────────────────────
interface LinearProgressProps { style?: React.CSSProperties; value?: number; variant?: string; }
export function LinearProgress({ style, value, variant }: LinearProgressProps) {
  const pct = variant === 'determinate' && value != null ? value : undefined;
  return (
    <div style={{ width: '100%', height: 4, background: '#e0e0e0', borderRadius: 2, overflow: 'hidden', ...style }}>
      <div style={{
        height: '100%',
        background: '#1976d2',
        borderRadius: 2,
        width: pct != null ? `${pct}%` : '100%',
        animation: pct == null ? 'mui-bar 1.5s infinite' : undefined,
        transition: pct != null ? 'width 0.3s ease' : undefined,
      }} />
      <style>{`@keyframes mui-bar{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}`}</style>
    </div>
  );
}

// ─── Table components ─────────────────────────────────────────────────────────
interface TableProps { style?: React.CSSProperties; size?: 'small' | 'medium'; children?: React.ReactNode; stickyHeader?: boolean; }
export function Table({ style, size, children, stickyHeader, ...rest }: TableProps) {
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: size === 'small' ? '0.8rem' : '0.875rem', ...style }} {...rest}>
      {children}
    </table>
  );
}

interface TableRowProps { style?: React.CSSProperties; hover?: boolean; selected?: boolean; onClick?: React.MouseEventHandler; children?: React.ReactNode; [key: string]: any; }
export function TableRow({ style, hover, selected, onClick, children, ...rest }: TableRowProps) {
  const [hovered, setHovered] = React.useState(false);
  const bg = selected ? 'rgba(25,118,210,0.08)' : hovered && hover ? 'rgba(0,0,0,0.04)' : undefined;
  return (
    <tr
      style={{ background: bg, cursor: onClick ? 'pointer' : undefined, ...style }}
      onClick={onClick}
      onMouseEnter={hover ? () => setHovered(true) : undefined}
      onMouseLeave={hover ? () => setHovered(false) : undefined}
      {...rest}
    >
      {children}
    </tr>
  );
}

interface TableCellProps { style?: React.CSSProperties; colSpan?: number; align?: 'left' | 'center' | 'right'; children?: React.ReactNode; [key: string]: any; }
export function TableCell({ style, colSpan, align, children, ...rest }: TableCellProps) {
  const base: React.CSSProperties = { padding: '6px 16px', borderBottom: '1px solid #e0e0e0', textAlign: align || 'left' };
  return <td style={{ ...base, ...style }} colSpan={colSpan} {...rest}>{children}</td>;
}

export function TableBody({ children, ...rest }: { children?: React.ReactNode; [key: string]: any }) {
  return <tbody {...rest}>{children}</tbody>;
}

interface TableHeadProps { children?: React.ReactNode; [key: string]: any; }
export function TableHead({ children, ...rest }: TableHeadProps) {
  // Re-map TableCell inside thead to th
  return <thead {...rest}>{children}</thead>;
}

interface TableContainerProps { style?: React.CSSProperties; className?: string; children?: React.ReactNode; }
export function TableContainer({ style, className, children }: TableContainerProps) {
  return <div style={{ overflowX: 'auto', ...style }} className={className}>{children}</div>;
}

// ─── MenuItem ─────────────────────────────────────────────────────────────────
interface MenuItemProps { value?: any; onClick?: React.MouseEventHandler; style?: React.CSSProperties; disabled?: boolean; children?: React.ReactNode; }
export function MenuItem({ value, onClick, style, disabled, children }: MenuItemProps) {
  return (
    <option value={value} disabled={disabled} style={{ padding: '6px 16px', ...style }}>
      {children}
    </option>
  );
}

// ─── Collapse ─────────────────────────────────────────────────────────────────
interface CollapseProps { in?: boolean; children?: React.ReactNode; timeout?: any; unmountOnExit?: boolean; }
export function Collapse({ in: inProp, children }: CollapseProps) {
  return inProp ? <>{children}</> : null;
}

// ─── Popover ──────────────────────────────────────────────────────────────────
interface PopoverProps {
  open: boolean;
  anchorEl?: Element | null;
  onClose?: () => void;
  anchorOrigin?: any;
  transformOrigin?: any;
  PaperProps?: any;
  children?: React.ReactNode;
}
export function Popover({ open, anchorEl, onClose, PaperProps, children }: PopoverProps) {
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  React.useEffect(() => {
    if (open && anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      setPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
    }
  }, [open, anchorEl]);

  if (!open) return null;
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1299 }} onClick={() => onClose?.()} />
      <div
        style={{
          position: 'absolute',
          zIndex: 1300,
          top: pos?.top ?? 0,
          left: pos?.left ?? 0,
          background: '#fff',
          borderRadius: 4,
          boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
          ...(PaperProps?.style || {}),
        }}
      >
        {children}
      </div>
    </>
  );
}

// ─── useMediaQuery / useTheme ─────────────────────────────────────────────────
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

export function useTheme() {
  return {
    breakpoints: {
      down: (bp: string) => {
        if (bp === 'sm') return '(max-width:600px)';
        if (bp === 'md') return '(max-width:960px)';
        if (bp === 'lg') return '(max-width:1280px)';
        return '(max-width:960px)';
      },
      up: (bp: string) => {
        if (bp === 'sm') return '(min-width:600px)';
        if (bp === 'md') return '(min-width:960px)';
        return '(min-width:600px)';
      },
    },
    spacing: (n: number) => n * 8,
  };
}
